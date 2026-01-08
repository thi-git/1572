import pandas as pd
import json
from ..models.road_group import Road_group
from ..utils.database import db
from ..utils import responses as resp
from ..utils.responses import response_with


# 新增道路群組
def create_group(request):
    data = request.get_json()
    df = pd.DataFrame([data])
    df.to_sql('road_group', db.engine, if_exists='append', index=False, chunksize=500)
    return response_with(resp.SUCCESS_200, value={'msg': "ok"})


# 取得所有道路群組(用於路口維護頁面的群組列表)
def get_all_group_name(request):
    data = request.get_json()
    city = data.get('city')

    with db.engine.connect() as connection:
        df = pd.read_sql('road_group', con=connection)
    df = df[(df['active'] == True) & (df['city'] == city)]
    res = df['name'].to_list()

    return response_with(resp.SUCCESS_200, value={'data': res})


# 取得所有道路群組(用於tc-select filter的道路群組資訊)
def get_road_group_data():
    sql = f'''
            select
                a.tc_id,
                a.road,
                case
                    when b.tc_id is not null then true
                    else false
                end as delay,
                case
                    when c.tc_id is not null then true
                    else false
                end as volume,
                d.svg_detail
            from
                public.tc_road_info a
            left join (
                select
                    distinct x.tc_id,
                    y.status
                from
                    public.delay_basic x
                join 
                                public.tc_uploaded_file y
                            on
                    x.tc_id = y.tc_id
                    and x.date = y.date
                where
                    y.status = 'active'
                            ) b
                        on
                a.tc_id = b.tc_id
            left join (
                select
                    distinct x.tc_id,
                    y.status
                from
                    public.volume_basic x
                join 
                                public.tc_uploaded_file y
                            on
                    x.tc_id = y.tc_id
                    and x.date = y.date
                where
                    y.status = 'active'
                            ) c
                        on
                a.tc_id = c.tc_id
            left join (
                select
                    distinct tc_id,svg_detail
                from
                    public.road_turning_static
                where
                    (svg_detail <> '' and svg_detail is not null)
                    and (road_param <> ''and road_param is not null)
                    and (road_section <> ''and road_section is not null)) d
                        on
                a.tc_id = d.tc_id

                '''

    df = pd.read_sql(sql, con=db.engine)

    # 將流量/延滯資料都沒有的tc過濾掉
    df = df[~((df['delay'] == False) & (df['volume'] == False))]

    # 取得縣市欄位資料
    df_tc_road_info = pd.read_sql('tc_road_info', con=db.engine)
    df_res = pd.merge(df, df_tc_road_info[['tc_id', 'city']], on='tc_id', how='left')

    # df = df.filter(items=['tc_id', 'road', 'turning', 'delay', 'volume'])
    data = df_res.to_dict(orient='records')

    # 解析原始數據，提取group和id
    parsed_data = []
    for item in data:
        if item['svg_detail']:
            detail = json.loads(item['svg_detail'])
        else:
            continue
        for g in detail["road_groups"]:
            parsed_data.append(
                {'group': f"{g}({item['city']})", 'id': item['tc_id'], 'road': item['road'], 'delay': item['delay'], 'volume': item['volume']})

    # 創建字典來儲存结果
    result_dict = {}

    # 遍歷解析後的數據並將其放入结果字典
    for item in parsed_data:
        group = item['group']

        if group not in result_dict:
            result_dict[group] = {'group': group, 'children': []}

        # 過濾掉重複的路口
        if not any(child['tc_id'] == item['id'] for child in result_dict[group]['children']):
            result_dict[group]['children'].append({
                'road': f"{item['id']} {item['road']}",
                'tc_id': item['id'],
                'delay': item['delay'],
                'volume': item['volume']
            })

    # 將结果從字典轉換為列表
    output = list(result_dict.values())

    return response_with(resp.SUCCESS_200, value={'data': output})
