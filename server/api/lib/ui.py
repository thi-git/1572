# -*- coding: utf-8 -*-
import datetime
import json
import pandas as pd
from ..models.ui import Ui_record
from ..utils.database import db
from flask_jwt_extended import (get_jwt_identity)
import sqlalchemy as sa

# 取得使用者UI設定
def get_ui_record():
    user_id = get_jwt_identity()
    query = sa.text("SELECT * FROM ui_record WHERE user_id=:user_id")
    with db.engine.connect() as conn:
        ui_record_df = pd.read_sql(query, conn, params={"user_id": user_id})

    if ui_record_df.empty:
        # 建立預設設定
        default_config = json.load(open('api/utils/ui_default_config.json', encoding="utf-8"))
        new_ui_config_df = pd.DataFrame([{
            'user_id': user_id,
            'page_configs': json.dumps(default_config, ensure_ascii=False),
            'update_time': datetime.datetime.now()
        }])
        with db.engine.begin() as conn:
            new_ui_config_df.to_sql('ui_record', conn, if_exists='append', index=False, chunksize=500)
        res = default_config
    else:
        res = json.loads(ui_record_df.to_dict('records')[0]['page_configs'])
    return {"data": res}


# 更新使用者UI設定
def set_ui_record(request):
    user_id = get_jwt_identity()
    req_json = request.get_json()
    ui_configs = req_json['ui_configs']
    ui_record_query = db.session.query(Ui_record).filter(Ui_record.user_id == user_id)
    page_configs_str = json.dumps(ui_configs, ensure_ascii=False)
    if ui_record_query.count() <= 0:
        db.session.add(Ui_record(user_id=user_id, page_configs=page_configs_str))
    else:
        ui_record_query.update({'page_configs': page_configs_str})
    db.session.commit()
