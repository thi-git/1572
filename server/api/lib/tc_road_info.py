# -*- coding: utf-8 -*-
import os
import pandas as pd
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from ..models.tc_road_info import TC_road_info
from ..utils import responses as resp
from ..utils.responses import response_with
from ..utils.sql_build import sql_insert, sql_update, sql_delete, sql_select
from ..utils.database import db


# 取得TC路口資料(全部)
def get_all_info(request):
    data = request.get_json()
    user_name = data.get('user_name')

    # 讀取users資料，找出該帳需要過濾的縣市和業主
    selected_auth = pd.read_sql(f"SELECT * FROM users WHERE user_name = '{user_name}'", con=db.engine).loc[0, 'selected_auth']

    df = pd.read_sql('tc_road_info', con=db.engine)
    res = df.filter(items=['tc_id', 'road', 'district', 'city'])

    # 過濾縣市(不用過濾業主，單純用縣市就好)
    res = res[res['city'].isin(selected_auth['city'])]

    return response_with(resp.SUCCESS_200, value={"data": res.to_dict('records')})


# 取得TC路口資料(上傳)
def get_uploaded_info(request):
    data = request.get_json()
    user_name = data.get('user_name')

    # 讀取users資料，找出該帳需要過濾的縣市和業主
    selected_auth = pd.read_sql(f"SELECT * FROM users WHERE user_name = '{user_name}'", con=db.engine).loc[0, 'selected_auth']

    # 讀取轉向量資料(過濾掉值為NULL的資料，並查看是否有編輯紀錄)
    df_turning = pd.read_sql('road_turning_static', con=db.engine).dropna()

    # 找出編輯完成的路口
    edit_list = df_turning[(df_turning['svg_detail'].notna() & df_turning['svg_detail'] != '') &
                           (df_turning['road_param'].notna() & df_turning['road_param'] != '') &
                           (df_turning['road_section'].notna() & df_turning['road_section'] != '')]['tc_id'].tolist()

    # 讀取TC靜態表資料，過濾出該帳號需要的縣市
    df_info = pd.read_sql('tc_road_info', con=db.engine)
    df_info = df_info[df_info['city'].isin(selected_auth['city'])]

    # 取得有上傳紀錄的TC
    sql = text("SELECT DISTINCT(tc_id), owner_name, project_num, data_type FROM tc_uploaded_file WHERE status = :status")
    df2 = pd.read_sql_query(sql, con=db.engine, params={"status": "active"})

    result_df = df2.groupby('tc_id').agg(owner_name=('owner_name', 'first'), project_num=('project_num', 'unique'), data_type=('data_type', 'unique')).reset_index()
    result_df['project_num'] = result_df['project_num'].apply(lambda x: x.tolist())
    result_df['data_type'] = result_df['data_type'].apply(lambda x: x.tolist())

    # 過濾出該帳號需要的業主
    result_df = result_df[result_df['owner_name'].isin(selected_auth['owner'])]

    merged_df = pd.merge(df_info, result_df, on='tc_id', how='inner')
    merged_df['edit_status'] = merged_df['tc_id'].isin(edit_list)  # 以此欄位判斷是否有編輯過

    return response_with(resp.SUCCESS_200, value={"data": merged_df.to_dict('records')})


# 取得縣市(全部) => 本來寫死在前端
def get_all_city(request):
    data = request.get_json()
    user_name = data.get('user_name')

    # 所有縣市(暫時這樣設定，之後優化)
    all_city = [{"city":"台北市","area":"北部"},{"city":"新北市","area":"北部"},{"city":"桃園市","area":"北部"},{"city":"基隆市","area":"北部"},{"city":"新竹市","area":"北部"},{"city":"新竹縣","area":"北部"},{"city":"宜蘭縣","area":"北部"},{"city":"台中市","area":"中部"},{"city":"苗栗縣","area":"中部"},{"city":"彰化縣","area":"中部"},{"city":"南投縣","area":"中部"},{"city":"雲林縣","area":"中部"},{"city":"高雄市","area":"南部"},{"city":"台南市","area":"南部"},{"city":"嘉義市","area":"南部"},{"city":"嘉義縣","area":"南部"},{"city":"屏東縣","area":"南部"},{"city":"花蓮縣","area":"東部"},{"city":"台東縣","area":"東部"},{"city":"澎湖縣","area":"離島"},{"city":"金門縣","area":"離島"},{"city":"連江縣","area":"離島"}]

    # 讀取users資料，找出該帳需要過濾的縣市
    selected_auth = pd.read_sql(f"SELECT * FROM users WHERE user_name = '{user_name}'", con=db.engine).loc[0, 'selected_auth']
    matched_cities = [item for item in all_city if item["city"] in selected_auth['city']]

    return response_with(resp.SUCCESS_200, value={"data": matched_cities})


# 取得行政區(全部)
def get_all_district(request):
    data = request.get_json()
    user_name = data.get('user_name')

    # 讀取users資料，找出該帳需要過濾的縣市和業主
    selected_auth = pd.read_sql(f"SELECT * FROM users WHERE user_name = '{user_name}'", con=db.engine).loc[0, 'selected_auth']

    # 讀取tc_road_info，過濾出該帳號需要的縣市
    tc_road_info = pd.read_sql('tc_road_info', con=db.engine)
    tc_road_info = tc_road_info[tc_road_info['city'].isin(selected_auth['city'])]

    df_filter = tc_road_info.drop_duplicates(subset=['district'])

    res = df_filter.groupby('city')['district'].apply(list).to_dict()
    return response_with(resp.SUCCESS_200, value={"data": res})


# 取得使用者篩選的TC路口資料
def search_road_info(request):
    data = request.get_json()
    tc_list = data.get('tc_id')
    district_new_list = data.get('district_new')  # 縣市

    # 待調整
    sql = f'''
            select
                a.tc_id,
                a.road,
                a.lat,
                a.lng,
                a.city,
                case
                    when b.tc_id is not null then true
                    else false
                end as delay,
                case
                    when c.tc_id is not null then true
                    else false
                end as volume,
                case
                    when d.tc_id is not null then true
                    else false
                end as turning
            from
                public.tc_road_info a
            left join (
                select
                    distinct x.tc_id, y.status
                from
                    public.delay_basic x
                join 
                    public.tc_uploaded_file y
                on 
                    x.tc_id = y.tc_id and x.date = y.date
                where
                    y.status = 'active'
                ) b
            on
                a.tc_id = b.tc_id
            left join (
                select
                    distinct x.tc_id, y.status
                from
                    public.volume_basic x
                join 
                    public.tc_uploaded_file y
                on 
                    x.tc_id = y.tc_id and x.date = y.date
                where
                    y.status = 'active'
                ) c
            on
                a.tc_id = c.tc_id
            left join (
                select
                    distinct tc_id
                from
                    public.road_turning_static
                where
                    (svg_detail <> ''
                        and svg_detail is not null)
                    and
                    (road_param <> ''
                        and road_param is not null)
                    and
                    (road_section <> ''
                        and road_section is not null)

                    ) d
            on
                a.tc_id = d.tc_id

                '''

    df = pd.read_sql(sql, con=db.engine)
    res1 = df[df['tc_id'].isin(tc_list)]
    res = res1[res1['city'].isin(district_new_list)]

    return response_with(resp.SUCCESS_200, value={"data": res.to_dict('records')})


# 取得使用者篩選的路口清單(上傳)
def road_list_uploaded_data(request):
    data = request.get_json()
    city_list = data.get('city')
    district_list = data.get('district')
    tc_list = data.get('tc_id')
    df_road = pd.read_sql('tc_road_info', con=db.engine)

    # 如果给定的地区参数有数据
    if city_list and len(city_list) > 0:
        df_road = df_road[df_road['city'].isin(city_list)]

    # 如果给定的行政区参数有数据
    if district_list and len(district_list) > 0:
        df_road = df_road[df_road['district'].isin(district_list)]

    # 如果给定的 tc_id 参数有数据
    if tc_list and len(tc_list) > 0:
        df_road = df_road[df_road['tc_id'].isin(tc_list)]

    # 有上传记录的业主与项目
    predicate = 'DISTINCT'
    column_dict = ['tc_id']
    table_name = 'tc_uploaded_file'
    where_dict = {'status': 'active'}
    sql_str, params = sql_select(predicate, column_dict, table_name, where_dict)
    df_upload = pd.read_sql_query(text(sql_str), con=db.engine, params=params)

    df_merged = df_road.merge(df_upload, on=['tc_id'], how='left', indicator=True)
    status_list = []
    for index, row in df_merged.iterrows():
        if row['_merge'] == 'both':
            status_list.append('file')
        elif row['_merge'] == 'left_only' or row['_merge'] == 'right_only':
            status_list.append('initial')
    df_road['status'] = status_list

    res = df_road.filter(items=['city', 'tc_id', 'road', 'district', 'lat', 'lng', 'update_time', 'status', 'last_editor'])
    return response_with(resp.SUCCESS_200, value={"data": res.to_dict('records')})


# 新增路口資料
def create_road(data_list):
    table_name = 'tc_road_info'
    insert_keys = ['tc_id', 'road', 'lat', 'lng', 'district', 'city', 'update_time', 'last_editor']
    for data in data_list.get_json():
        insert_dict = {}
        for key in insert_keys:
            if key in data:
                insert_dict[key] = data[key]
        insert_dict['road'] = data['road']
        sql_str = sql_insert(table_name, insert_dict)
        db.session.execute(text(sql_str), insert_dict)
    db.session.commit()
    return response_with(resp.SUCCESS_200, value={"data": '新增路口資料'})


# 更新路口資料
def update_road(data_list):
    table_name = 'tc_road_info'
    update_keys = ['road', 'lat', 'lng', 'district', 'city', 'update_time', 'last_editor']
    id_key = 'tc_id'

    for data in data_list.get_json():
        update_dict = {key: data[key] for key in update_keys if key in data}
        id_dict = {id_key: data[id_key]}
        update_dict['road'] = data['road']
        sql_str = sql_update(table_name, id_dict, update_dict)
        db.session.execute(text(sql_str), {**update_dict, **id_dict})

    db.session.commit()
    return response_with(resp.SUCCESS_200, value={"data": '更新路口資料'})


# 刪除路口資料
def delete_road(data_list):
    table_name1 = 'tc_road_info'
    delete_keys = ['tc_id']
    table_name2 = 'tc_uploaded_file'
    update_where_keys = ['tc_id']
    for data in data_list.get_json():
        delete_dict = {}
        for key in delete_keys:
            if key in data:
                delete_dict[key] = data[key]
        sql_str1 = sql_delete(table_name1, delete_dict)
        db.session.execute(text(sql_str1), delete_dict)

        update_dict = {}
        update_where_dict = {}
        for key in update_where_keys:
            if key in data:
                update_where_dict[key] = data[key]
        update_dict['status'] = 'remove'
        sql_str2 = sql_update(table_name2, update_where_dict, update_dict)
        db.session.execute(text(sql_str2), {**update_dict, **update_where_dict})
    db.session.commit()
    return response_with(resp.SUCCESS_200, value={"data": '刪除路口資料'})


# 確認是否有重複值
def check_duplicate(data):
    table_name = 'tc_road_info'
    keys_list = ['tc_id', 'road']
    data_list = data.get_json()
    res = ''

    if not all(key in keys_list for key in data_list.keys()):
        return response_with(resp.BAD_REQUEST_400)
    else:
        if 'tc_id' in data_list and 'road' in data_list:
            tc_id = data_list['tc_id']
            road = data_list['road']

            sql_tc = text(f"SELECT EXISTS (SELECT 1 FROM {table_name} WHERE tc_id = :tc_id)")
            sql_road = text(f"SELECT EXISTS (SELECT 1 FROM {table_name} WHERE road = :road)")
            sql_info_tc = text(f"SELECT road, city, district FROM {table_name} WHERE tc_id = :tc_id")
            sql_info_road = text(f"SELECT tc_id, city, district FROM {table_name} WHERE road = :road")

            try:
                with db.engine.connect() as con:
                    result_tc = con.execute(sql_tc, tc_id=tc_id).fetchone()[0]
                    result_road = con.execute(sql_road, road=road).fetchone()[0]

                    if result_tc and result_road:
                        res = 'both exist'
                    elif result_tc and not result_road:
                        result_info = con.execute(sql_info_tc, tc_id=tc_id).fetchone()
                        road, city, district = result_info['road'], result_info['city'], result_info['district']
                        res = {"city": city, "district": district, "road": road}
                    elif not result_tc and result_road:
                        result_info = con.execute(sql_info_road, road=road).fetchone()
                        tc_id, city, district = result_info['tc_id'], result_info['city'], result_info['district']
                        res = {"tc_id": tc_id, "city": city, "district": district}
            except SQLAlchemyError as e:
                return response_with(resp.SERVER_ERROR_500, message=str(e))
    return response_with(resp.SUCCESS_200, value={"data": res})


# 取得時間範圍(上傳)
def tc_uploaded_date():
    predicate = 'DISTINCT'
    column_dict = ['tc_id', 'date']
    table_name = 'tc_uploaded_file'
    where_dict = {'status': 'active'}

    sql, where_dict = sql_select(predicate, column_dict, table_name, where_dict)
    with db.engine.connect() as con:
        result = con.execute(db.text(sql), where_dict)
        res_dict = {}
        for row in result:
            key = row['tc_id']
            value = row['date'].strftime('%Y-%m-%d')
            if key in res_dict:
                if value not in res_dict[key]:
                    res_dict[key].append(value)
            else:
                res_dict[key] = [value]
    return response_with(resp.SUCCESS_200, value={"data": res_dict})


# 檢核頁面查看所選TC是否有共同調查日期
def common_time_test(request):
    data = request.get_json()
    tc_list = data.get('tc_id')

    # 基本查表(查詢並輸出volume_basic基本資料) => 每個TC選出最新一筆資料做輸出
    df_basic = pd.read_sql('volume_basic', con=db.engine)
    df_basic = df_basic[df_basic['tc_id'].isin(tc_list)]

    # 找出所有TC的共同日期
    tc_id_dates = {}
    for idx, row in df_basic.iterrows():
        tc_id = row['tc_id']
        date = row['date']
        if tc_id not in tc_id_dates:
            tc_id_dates[tc_id] = set()
        tc_id_dates[tc_id].add(date)

    common_dates = set.intersection(*tc_id_dates.values())

    return response_with(resp.SUCCESS_200, value={"data": common_dates})


# 傳送所有filter相關資料(用於連動)
def get_uploaded_filter_data(request):
    data = request.get_json()
    user_name = data.get('user_name')

    # 讀取users資料，找出該帳需要過濾的縣市和業主
    selected_auth = pd.read_sql(f"SELECT * FROM users WHERE user_name = '{user_name}'", con=db.engine).loc[0, 'selected_auth']

    # 讀取tc_uploaded_file資料，過濾出該帳號需顯示的業主
    tc_uploaded_file = pd.read_sql('SELECT tc_id, data_type, owner_name, project_num FROM tc_uploaded_file', con=db.engine)
    tc_uploaded_file = tc_uploaded_file[tc_uploaded_file['owner_name'].isin(selected_auth['owner'])]

    # 讀取tc_road_info資料，過濾出該帳號需顯示的縣市
    tc_road_info = pd.read_sql('SELECT tc_id, city FROM tc_road_info', con=db.engine)
    tc_road_info = tc_road_info[tc_road_info['city'].isin(selected_auth['city'])]

    # 過濾掉其他類型的資料
    filtered_data = tc_uploaded_file[tc_uploaded_file['data_type'] != 'other']

    # merge兩張表，加入city欄位
    merged_data = pd.merge(filtered_data, tc_road_info, on='tc_id', how='left').dropna()

    result = {}

    # 依data_type分組
    for data_type, group_data in merged_data.groupby('data_type'):
        result[data_type] = {}

        # 依owner_name分組
        for owner_name, owner_group in group_data.groupby('owner_name'):
            # 收集project_num並填入city欄位的值
            project_nums = owner_group[['project_num', 'city']].drop_duplicates()
            result[data_type][owner_name] = {}

            # 依project_num分組
            for project_num, group in project_nums.groupby('project_num'):
                result[data_type][owner_name][project_num] = group['city'].tolist()

    return response_with(resp.SUCCESS_200, value={"data": result})

