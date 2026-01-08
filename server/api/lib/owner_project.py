# -*- coding: utf-8 -*-
import os
import pandas as pd
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from ..models.owner_project import Owner_project
from ..utils import responses as resp
from ..utils.responses import response_with
from ..utils.database import db
from ..utils.sql_build import sql_insert, sql_update, sql_delete, sql_select


# 取得業主名稱(全部)
def get_all_owner():
    # 讀取owner_project資料表，將owner_name欄位內容以list輸出
    with db.engine.connect() as connection:
        df = pd.read_sql('owner_project', con=db.engine)
    res = df['owner_name'].drop_duplicates().to_list()

    return response_with(resp.SUCCESS_200, value={"data": res})


# 取得業主名稱(上傳)
def get_all_upload_owner():
    predicate = 'DISTINCT'
    column_dict = ['owner_name']
    table_name = 'tc_uploaded_file'
    where_dict = {'status': 'active'}
    sql, where_dict = sql_select(predicate, column_dict, table_name, where_dict)

    with db.engine.connect() as con:
        result = con.execute(db.text(sql), where_dict)
        res = [row['owner_name'] for row in result]

    return response_with(resp.SUCCESS_200, value={"data": res})


# 取得專案編號(全部)
def get_all_project(request):
    data = request.get_json()
    user_name = data.get('user_name')

    # 讀取users資料，找出該帳需要過濾的縣市和業主
    with db.engine.connect() as connection:
        if user_name != "":
            # selected_auth = pd.read_sql(f"SELECT * FROM users WHERE user_name = '{user_name}'", con=db.engine).loc[0, 'selected_auth']
            selected_auth = pd.read_sql(text("SELECT * FROM users WHERE user_name = :user_name"), con=connection, params={'user_name': user_name}).loc[0, 'selected_auth']

        # 取得業主資料並過濾出該帳號需要的業主
        df = pd.read_sql('owner_project', con=connection)

    # 如果user_name為空字串，就不過濾
    if user_name != "":
        df = df[df['owner_name'].isin(selected_auth['owner'])]

    res_dict = {}
    for index, row in df.iterrows():
        key = row['owner_name']
        value = row['project_num']
        if key in res_dict:
            res_dict[key].append(value)
        else:
            res_dict[key] = [value]

    return response_with(resp.SUCCESS_200, value={"data": res_dict})


# 取得專案編號(上傳)
def get_all_upload_project():
    predicate = 'DISTINCT'
    column_dict = ['owner_name', 'project_num']
    table_name = 'tc_uploaded_file'
    where_dict = {'status': 'active'}

    sql, where_dict = sql_select(predicate, column_dict, table_name, where_dict)
    with db.engine.connect() as con:
        result = con.execute(db.text(sql), where_dict)
        res_dict = {}
        for row in result:
            key = row['owner_name']
            value = row['project_num']
            if key in res_dict:
                if value not in res_dict[key]:
                    res_dict[key].append(value)
            else:
                res_dict[key] = [value]

    return response_with(resp.SUCCESS_200, value={"data": res_dict})


# 取得使用者篩選的業主名稱&專案編號
def owner_project_selected_data(request):
    with db.engine.connect() as connection:
        data = request.get_json()
        owner_name_list = data.get('owner_name')
        project_num_list = data.get('project_num')
        user_name = data.get('user_name')
        df_owner = pd.read_sql('owner_project', con=connection)
        table_name = 'tc_uploaded_file'

        # 如果給的業主名稱參數有資料
        if owner_name_list and len(owner_name_list) > 0:
            df_owner = df_owner[df_owner['owner_name'].isin(owner_name_list)]

        # 如果給的專案編號參數有資料
        if project_num_list and len(project_num_list) > 0:
            df_owner = df_owner[df_owner['project_num'].isin(project_num_list)]

        # 讀取users資料，找出該帳需要過濾的縣市和業主
        # selected_auth = pd.read_sql(f"SELECT * FROM users WHERE user_name = '{user_name}'", con=db.engine).loc[0, 'selected_auth']['owner']
        selected_auth = pd.read_sql(text("SELECT * FROM users WHERE user_name = :user_name"), con=connection, params={'user_name': user_name}).loc[0, 'selected_auth']['owner']
        df_owner = df_owner[df_owner['owner_name'].isin(selected_auth)].reset_index(drop=True)

        # status
        predicate = 'DISTINCT'
        column_dict = ['owner_name', 'project_num']
        where_dict = {'status': 'active'}
        sql, params = sql_select(predicate, column_dict, table_name, where_dict)
        df_upload = pd.read_sql_query(text(sql), con=connection, params=params)
        df_merged = df_owner.merge(df_upload, on=['owner_name', 'project_num'], how='left', indicator=True)
        status_list = []
        for index, row in df_merged.iterrows():
            if row['_merge'] == 'both':
                status_list.append('file')
            elif row['_merge'] == 'left_only' or row['_merge'] == 'right_only':
                status_list.append('initial')
        df_owner['status'] = status_list

        # tc_count, vol_count, delay_count, other_count
        predicate = ''
        tc_str = 'COUNT(DISTINCT tc_id) AS tc_count'
        vol_str = '''COUNT(CASE WHEN data_type = 'volume' THEN tc_id END) AS volume_count'''
        delay_str = '''COUNT(CASE WHEN data_type = 'delay' THEN tc_id END) AS delay_count'''
        other_str = '''COUNT(CASE WHEN data_type = 'other' THEN tc_id END) AS other_count'''
        column_dict = ['owner_name', 'project_num', tc_str, vol_str, delay_str, other_str]
        sql_tc, params_tc = sql_select(predicate, column_dict, table_name, where_dict)
        sql_tc += ' GROUP BY owner_name, project_num'
        df_tc_num = pd.read_sql_query(text(sql_tc), con=connection, params=params_tc)
        df_merge_count = df_owner.merge(df_tc_num, on=['owner_name', 'project_num'], how='left')
        df_merge_count[['tc_count', 'volume_count', 'delay_count', 'other_count']] = df_merge_count[
            ['tc_count', 'volume_count', 'delay_count', 'other_count']].fillna(0)

        res = df_merge_count.filter(
            items=['id', 'owner_name', 'project_num', 'update_time', 'status', 'tc_count', 'volume_count', 'delay_count',
                'other_count', 'last_editor'])
    return response_with(resp.SUCCESS_200, value={"data": res.to_dict('records')})


# 新增業主名稱與專案
def create_owner_project(data_list):
    table_name = 'owner_project'
    insert_keys = ['id', 'owner_name', 'project_num', 'update_time', 'last_editor']
    for data in data_list.get_json():
        insert_dict = {}
        for key in insert_keys:
            if key in data:
                insert_dict[key] = data[key]
        sql_str = sql_insert(table_name, insert_dict)
        db.session.execute(text(sql_str), insert_dict)
    db.session.commit()
    return response_with(resp.SUCCESS_200, value={"data": '新增資料成功'})


# 刪除業主名稱與專案(包含更改status)
def delete_owner_project(data_list):
    table_name1 = 'owner_project'
    delete_keys = ['id']
    table_name2 = 'tc_uploaded_file'
    update_where_keys = ['owner_name', 'project_num']
    for data in data_list.get_json():
        delete_dict = {}
        for key in delete_keys:
            if key in data:
                delete_dict[key] = data[key]
        sql_str1 = sql_delete(table_name1, delete_dict)
        db.session.execute(text(sql_str1), delete_dict)

        update_dict = {}
        update_where_list = {}
        for key in update_where_keys:
            if key in data:
                update_where_list[key] = data[key]
        update_dict['status'] = 'remove'
        sql_str2 = sql_update(table_name2, update_where_list, update_dict)
        db.session.execute(text(sql_str2), {**update_dict, **update_where_list})
    db.session.commit()
    return response_with(resp.SUCCESS_200, value={"data": '刪除資料成功'})


# 更新業主名稱與專案
def update_owner_project(data_list):
    table_name = 'owner_project'
    update_keys = ['owner_name', 'project_num', 'update_time', 'last_editor']

    for data in data_list.get_json():
        update_dict = {key: data[key] for key in update_keys if key in data}
        id_dict = {'id': data['id']}
        sql_str = sql_update(table_name, id_dict, update_dict)
        db.session.execute(text(sql_str), {**update_dict, **id_dict})

    db.session.commit()
    return response_with(resp.SUCCESS_200, value={"data": '更新資料成功'})


# 確認是否有重複值
def check_duplicate(data):
    table_name = 'owner_project'
    keys_list = ['owner_name', 'project_num']
    data_list = data.get_json()
    res = ''

    if not all(key in keys_list for key in data_list.keys()):
        return response_with(resp.BAD_REQUEST_400)
    else:
        if 'owner_name' in data_list and 'project_num' in data_list:
            owner_name = data_list['owner_name']
            project_num = data_list['project_num']

            sql_owner = text(f"SELECT EXISTS (SELECT 1 FROM {table_name} WHERE owner_name = :owner_name)")
            sql_project = text(f"SELECT EXISTS (SELECT 1 FROM {table_name} WHERE project_num = :project_num)")
            sql_info_project = text(f"SELECT owner_name FROM {table_name} WHERE project_num = :project_num")

            try:
                with db.engine.connect() as con:
                    result_owner = con.execute(sql_owner, owner_name=owner_name).fetchone()[0]
                    result_project = con.execute(sql_project, project_num=project_num).fetchone()[0]

                    if result_owner and result_project:
                        res = 'both exist'
                    elif result_owner and not result_project:
                        res = 'owner_name exists'
                    elif not result_owner and result_project:
                        owner_name_result = con.execute(sql_info_project, project_num=project_num).fetchone()
                        owner_name = owner_name_result[0]
                        res = owner_name
            except SQLAlchemyError as e:
                return response_with(resp.SERVER_ERROR_500, message=str(e))

        else:
            key = list(data_list.keys())[0]
            value = data_list[key]
            sql = text(f"SELECT EXISTS (SELECT 1 FROM {table_name} WHERE {key} = :value)")

            try:
                with db.engine.connect() as con:
                    res = ''
                    result = con.execute(sql, value=value).fetchone()[0]
                    if result:
                        res += key

            except SQLAlchemyError as e:
                return response_with(resp.SERVER_ERROR_500, message=str(e))

    return response_with(resp.SUCCESS_200, value={"data": res})
