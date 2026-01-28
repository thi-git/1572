# -*- coding: utf-8 -*-
import os
import pandas as pd
from functools import reduce
from api.models.tc_uploaded_file import TC_uploaded_file, TcSchema
from api.utils import responses as resp
from api.utils.responses import response_with
from api.utils.sql_build import *
from api.utils.database import db
from api.utils.unZip import Zip
import json
from openpyxl import load_workbook
from openpyxl.utils.dataframe import dataframe_to_rows
import numpy as np
from api.config.config import DevelopmentConfig as CFG
from datetime import datetime
import uuid
import holidays
import shutil
import platform
import subprocess
from sqlalchemy.sql import text
import math


# 新增TC上傳紀錄(tc_uploaded_file資料表)
def create_tc_upload_record(request):
    data = request
    tc_schema = TcSchema()
    tc = tc_schema.load(data)
    tc.create()


# 接收前端固定打API的程序(每五分鐘打一次，若有錯就代表token過期，設定系統自行登出)
def token_timeout_test():
    res = 'token尚未過期'
    return response_with(resp.SUCCESS_200, value={"data": res})


# 搜尋上傳紀錄(地圖查詢頁面)
def search_record(request):
    data = request.get_json()

    tc_list = data.get('tc_id')
    data_type_list = data.get('data_type')
    time_start = data.get('time_start')
    time_end = data.get('time_end')
    owner_name_list = data.get('owner_name')  # 業主名稱
    project_num_list = data.get('project_num')  # 專案編號
    district_new_list = data.get('district_new')  # 縣市

    # 選出status為active的資料(待調整)
    # df_first = pd.read_sql('tc_uploaded_file', con=db.engine)
    # df = df_first[df_first['status'] == 'active']

    with db.engine.connect() as connection:
        df = pd.read_sql_query(text("""select id, tc_id, data_type, owner_name, project_num, date, date_group FROM tc_uploaded_file WHERE "status" = 'active'"""), con=connection)
    # 用參數過濾後的資料(如果沒有參數，等於不用走以下過濾流程 => 就會保留全部資料)
    # 如果給的tc參數有資料
    if tc_list and len(tc_list) > 0:
        df = df[df['tc_id'].isin(tc_list)]

    # 如果給的資料類型參數有資料
    if data_type_list and len(data_type_list) > 0:
        df = df[df['data_type'].isin(data_type_list)]

    # 如果給的業主名稱參數有資料
    if owner_name_list and len(owner_name_list) > 0:
        df = df[df['owner_name'].isin(owner_name_list)]

    # 如果給的專案編號參數有資料
    if project_num_list and len(project_num_list) > 0:
        df = df[df['project_num'].isin(project_num_list)]

    # 如果給的縣市參數有資料
    if district_new_list and len(district_new_list) > 0:
        with db.engine.connect() as connection:
            # 讀取tc_road_info資料表
            tc_road_info = pd.read_sql('tc_road_info', con=connection)
        merged_df = pd.merge(df, tc_road_info, on='tc_id')
        df = merged_df[merged_df['city'].isin(district_new_list)]

    # 如果給的起始時間有資料
    if time_start and time_end and time_start != '' and time_end != '':
        # df = df[(df['date'] >= time_start) & (df['date'] <= time_end)]
        df = df[df['date'].between(pd.to_datetime(time_start).date(), pd.to_datetime(time_end).date())]

        # 新增date_type欄位標示平假日
        df['date_type'] = df['date'].apply(lambda x: get_day_type(x))

    res = []
    # 按tc_id分組(不按路名分組，因為無法確保上傳填的路名和靜態資料名稱是否一樣)
    for road, items in df.groupby(['tc_id']):
        pack = {}
        # 按資料類型分組
        for data_type, sub_df in items.groupby(['data_type']):
            # 將日期格式化
            sub_df['date'] = sub_df['date'].apply(lambda date: date.strftime("%Y-%m-%d"))
            pack[data_type] = sub_df.filter(items=['id', 'tc_id', 'date', 'date_group', 'date_type']).to_dict('records')
        res.append({road: pack})

    return response_with(resp.SUCCESS_200, value={"data": res})


# 搜尋上傳紀錄_v2(資料庫查詢頁面)
def search_record_v2(request):
    data = request.get_json()

    tc_list = data.get('tc_id')
    tc_list.append('')  # 因為其他資料類型(待調整)
    data_type_list = data.get('data_type')
    time_start = data.get('time_start')
    time_end = data.get('time_end')
    owner_name_list = data.get('owner_name')  # 業主名稱
    project_num_list = data.get('project_num')  # 專案編號
    holiday_type_list = data.get('holiday_type')  # 平假日類型
    district_new_list = data.get('district_new')  # 縣市
    district_new_list.append(None)  # 因為其他資料類型(待調整)

    # 選出status為active的資料(待調整)
    sql = """select tc_uploaded_file.id, tc_uploaded_file.tc_id, tc_uploaded_file.data_type, 
             tc_uploaded_file.owner_name, tc_uploaded_file.project_num, tc_uploaded_file.holiday_type, 
             tc_uploaded_file.date, tc_uploaded_file.date_group,
             tc_uploaded_file.commit, tc_road_info.road, tc_road_info.lat, tc_road_info.lng, tc_road_info.city
             FROM tc_uploaded_file LEFT JOIN tc_road_info USING (tc_id) WHERE status = 'active'"""
    
    with db.engine.connect() as connection:
        df = pd.read_sql_query(text(sql), con=connection)

    # 用參數過濾後的資料(如果沒有參數，等於不用走以下過濾流程 => 就會保留全部資料)
    # 如果給的tc參數有資料
    if tc_list and len(tc_list) > 0:
        df = df[df['tc_id'].isin(tc_list)]

    # 如果給的資料類型參數有資料
    if data_type_list and len(data_type_list) > 0:
        df = df[df['data_type'].isin(data_type_list)]

    # 如果給的業主名稱參數有資料
    if owner_name_list and len(owner_name_list) > 0:
        df = df[df['owner_name'].isin(owner_name_list)]

    # 如果給的專案編號參數有資料
    if project_num_list and len(project_num_list) > 0:
        df = df[df['project_num'].isin(project_num_list)]

    # 如果給的平假日類型參數有資料
    if holiday_type_list and len(holiday_type_list) > 0:
        df = df[df['holiday_type'].isin(holiday_type_list)]

    # 如果給的縣市參數有資料
    if district_new_list and len(district_new_list) > 0:
        df = df[df['city'].isin(district_new_list)]

    # 如果給的起始時間有資料
    if time_start and time_end and time_start != '' and time_end != '':
        df = df[df['date'].between(pd.to_datetime(time_start).date(), pd.to_datetime(time_end).date())]

        # # 新增date_type欄位標示平假日
        # df['date_type'] = df['date'].apply(lambda x: get_day_type(x))

    if not df.empty:
        df.loc[df['data_type'] == 'volume', 'download_format'] = '下載檔'
        df.loc[df['data_type'] == 'delay', 'download_format'] = '下載檔'
        df.loc[df['data_type'] == 'other', 'download_format'] = '其他'
        df.loc[df['data_type'] == 'other', 'lat'] = ''
        df.loc[df['data_type'] == 'other', 'lng'] = ''

        # 如果是其他資料類型
    res = df.to_dict('records')

    return response_with(resp.SUCCESS_200, value={"data": res})


# 刪除紀錄
def delete_record(request):
    data = request.get_json()
    id_list = data.get('id')

    record = []
    for id in id_list:
        res = TC_uploaded_file.detele(id)
        record.append({'id': id, 'result': res})

    return response_with(resp.SUCCESS_200, value={"msg": record})


# 上傳檔案
def upload_file(request):
    if 'file' in request.files and 'data_type' in request.form:
        file = request.files['file']
        data_type = request.form.get('data_type')
        commit = request.form.get('commit')  # 上傳備註
        if data_type in ['volume', 'delay']:
            # 檢查附檔名
            if (lambda name: name and '.' in name and name.rsplit('.', 1)[1] in ['xlsx'])(file.filename):
                # 儲存使用者上傳的原檔(之後讀取excel內容時需要使用)
                filename = file.filename
                file_path = os.path.join(CFG.UPLOAD_FOLDER, filename)
                file.save(file_path)

                page_two_data = {}
                if data_type == 'volume':
                    # 讀取第二分頁資料基本資料
                    page_two_data = get_page_two_data_volume(file_path)
                    if page_two_data['res_type'] == 'error':
                        return {"http_code": 422, "code": "fileContentError", "message": page_two_data['error_str']}

                    # 讀取excel資料，新增一筆資料到tc_uploaded_file資料表
                    df_all = save_uploaded_data(file_path, page_two_data['res_obj'], data_type, commit)
                    if df_all['res_type'] == 'error':
                        return {"http_code": 422, "code": "fileContentError", "message": df_all['error_str']}

                    # 使用第一頁df，新增多筆資料到volume_turning資料表
                    save_upload_volume_turning(df_all['res_obj']['page_one_df'], page_two_data['res_obj'])

                    # 使用第二頁df，新增一筆資料到volume_basic資料表
                    save_upload_volume_basic(df_all['res_obj']['page_two_df'], page_two_data['res_obj'])

                if data_type == 'delay':
                    # 讀取第二分頁資料基本資料
                    page_two_data = get_page_two_data_delay(file_path)
                    if page_two_data['res_type'] == 'error':
                        return {"http_code": 422, "code": "fileContentError", "message": page_two_data['error_str']}

                    # 讀取excel資料，新增一筆資料到tc_uploaded_file資料表
                    df_all = save_uploaded_data(file_path, page_two_data['res_obj'], data_type, commit)
                    if df_all['res_type'] == 'error':
                        return {"http_code": 422, "code": "fileContentError", "message": df_all['error_str']}

                    # 使用第一頁df，新增多筆資料到delay_save資料表
                    save_upload_delay_save(df_all['res_obj']['page_one_df'], page_two_data['res_obj'])

                    # 使用第二頁df，新增一筆資料到delay_basic資料表
                    save_upload_delay_basic(df_all['res_obj']['page_two_df'], page_two_data['res_obj'])

                # 檔案確認上傳後，製作出下載檔，並存路徑到資料表中 => 上傳檔版本(原檔)/下載檔版本(模版)
                generate_download_excel(page_two_data['res_obj'], data_type, file_path, page_two_data['res_obj'])

                res = response_with(resp.SUCCESS_200, value={"msg": 'ok'})
                return res

        elif data_type == 'other':
            filename = file.filename
            file_path = os.path.join(CFG.UPLOAD_FOLDER, filename)
            file.save(file_path)

            # 讀取excel資料，新增一筆資料到tc_uploaded_file資料表
            save_uploaded_data_other(filename, commit)
            res = response_with(resp.SUCCESS_200, value={"msg": 'ok'})

            return res
    return response_with(resp.INVALID_INPUT_422)


# upload需要的function
# 取得流量分頁二中的部分資料
def get_page_two_data_volume(path):
    # 取得第二頁工作表名稱
    excel_file = pd.ExcelFile(path)
    all_sheet = excel_file.sheet_names

    if '路口基本資料(IN)' in all_sheet:
        df = pd.read_excel(path, sheet_name='路口基本資料(IN)')

        with db.engine.connect() as connection:
            # 從sample_file找出該檔案的當前version
            df_sample = pd.read_sql('sample_file', con=connection)
            intersection_type = str(df.loc[df['※請填入'] == '路口類型：'].iat[0, 1]).split(' ')[0]
            if intersection_type in ['三叉路口','四叉路口','正交四叉路口', '五叉路口', '六叉路口']:
                # 路口類型防呆
                now_version = df_sample[(df_sample['name'] == intersection_type) & (df_sample['data_type'] == 'volume')]['version'].values[0]
                version_info = df.loc[df['※請填入'] == '版本號：'].iat[0, 1]

                # 如果版本號欄位符合當前最新版
                if version_info == now_version:
                    # 檢查所填TC是否在所有TC編號中:
                    tc_list = pd.read_sql('tc_road_info', con=connection)['tc_id'].tolist()
                    tc_id = df.loc[df['※請填入'] == 'TC編號：'].iat[0, 1]
                    if tc_id in tc_list:
                        # 檢查業主名稱和專案編號是否存在
                        owner_list = pd.read_sql('owner_project', con=connection)['owner_name'].drop_duplicates().tolist()
                        project_list = pd.read_sql('owner_project', con=connection)['project_num'].tolist()
                        owner_name = df.loc[df['※請填入'] == '業主名稱：'].iat[0, 1]
                        project_num = str(df.loc[df['※請填入'] == '專案編號：'].iat[0, 1])
                        if owner_name not in owner_list and project_num not in project_list:
                            return {"res_type": "error",
                                    "error_str": f"所填寫之業主名稱與專案編號均不存在，請先前往清單管理頁面設定"}
                        if owner_name not in owner_list:
                            return {"res_type": "error", "error_str": f"所填寫之業主名稱不存在，請先前往清單管理頁面設定"}
                        if project_num not in project_list:
                            return {"res_type": "error", "error_str": f"所填寫之專案編號不存在，請先前往清單管理頁面設定"}
                        else:
                            road = df.loc[df['※請填入'] == '路口名稱：'].iat[0, 1]
                            area_name = df.loc[df['※請填入'] == '行政區域：'].iat[0, 1]
                            # 上傳檔案中，日期可能吃到'-'或'/'的情況，針對'/'做處理(原因待查明)
                            if '/' in str(df.loc[df['※請填入'] == '日期：'].iat[0, 1]):
                                test = str(df.loc[df['※請填入'] == '日期：'].iat[0, 1]).replace("/", "-")
                            else:
                                test = str(df.loc[df['※請填入'] == '日期：'].iat[0, 1])
                            date = test.split(' ')[0]
                            holiday_type = df.loc[df['※請填入'] == '平假日：'].iat[0, 1]
                            investigate_time = df.loc[df['※請填入'] == '調查時段：'].iat[0, 1]
                            weather = df.loc[df['※請填入'] == '天候：'].iat[0, 1]
                            intersection_type = str(df.loc[df['※請填入'] == '路口類型：'].iat[0, 1]).split(' ')[0]

                            # 檢查資訊是否填寫完整
                            message_arr = []
                            type_arr = [
                                {"name": '業主名稱', "input_value": owner_name},
                                {"name": '專案編號', "input_value": project_num},
                                {"name": 'TC編號', "input_value": tc_id},
                                {"name": '路口名稱', "input_value": road},
                                {"name": '行政區域', "input_value": area_name},
                                {"name": '日期', "input_value": date},
                                {"name": '平假日', "input_value": holiday_type},
                                {"name": '調查時段', "input_value": investigate_time},
                                {"name": '天候', "input_value": weather},
                                {"name": '路口類型', "input_value": intersection_type},
                            ]

                            # 表格有空值
                            test = {'三叉路口': 4, '四叉路口': 5, '正交四叉路口': 5, '五叉路口': 6, '六叉路口': 7}

                            subset = df.iloc[15:19, 1:test[intersection_type]]
                            if not subset.isna().any().any():
                                for data in type_arr:
                                    if data['name'] == '日期':
                                        if data['input_value'] == 'nan':
                                            message_arr.append(data['name'])
                                    else:
                                        if not isinstance(data['input_value'], str):
                                            message_arr.append(data['name'])

                                # 如果message_arr沒有內容，代表所有內容都有填寫完整，否則需提供未填寫的內容給前端顯示
                                if len(message_arr) == 0:
                                    return {"res_type": "ok",
                                            "res_obj": {'owner_name': owner_name, 'project_num': project_num,
                                                        'tc_id': tc_id, 'road': road,
                                                        'date': date, 'holiday_type': holiday_type,
                                                        'intersection_type': intersection_type,
                                                        'page_two_df': df}}
                                else:
                                    return {"res_type": "error", "error_str": f"【{'、'.join(message_arr)}】未填寫完整"}
                            else:
                                return {"res_type": "error", "error_str": '請確認各方向路口填寫完整'}
                    else:
                        return {"res_type": "error", "error_str": 'TC編號填寫有誤或留有多餘空白'}
                else:
                    return {"res_type": "error", "error_str": '此範例檔為舊版，請先至下載頁面取得最新版範例檔'}
            else:
                return {"res_type": "error", "error_str": '請檢查路口類型是否填寫正確'}
    else:
        return {"res_type": "error", "error_str": '請將資料類型設定為延滯'}


# 取得延滯分頁二中的部分資料
def get_page_two_data_delay(path):
    # 取得第二頁工作表名稱
    excel_file = pd.ExcelFile(path)
    all_sheet = excel_file.sheet_names

    if '基本資料' in all_sheet:
        df = pd.read_excel(path, sheet_name='基本資料')

        with db.engine.connect() as connection:
            # 從sample_file找出該檔案的當前version
            df_sample = pd.read_sql('sample_file', con=connection)
            intersection_type = str(df.loc[df['※請填入'] == '路口類型：'].iat[0, 1]).split(' ')[0]
            if intersection_type in ['四叉路口', '五叉路口', '六叉路口']:
                # 路口類型防呆
                now_version = df_sample[(df_sample['name'] == intersection_type) & (df_sample['data_type'] == 'delay')]['version'].values[0]
                version_info = df.loc[df['※請填入'] == '版本號：'].iat[0, 1]

                # 如果版本號欄位符合當前最新版
                if version_info == now_version:
                    # 檢查所填TC是否在所有TC編號中:
                    tc_list = pd.read_sql('tc_road_info', con=connection)['tc_id'].tolist()
                    tc_id = df.loc[df['※請填入'] == 'TC編號：'].iat[0, 1]
                    if tc_id in tc_list:
                        # 檢查業主名稱和專案編號是否存在
                        owner_list = pd.read_sql('owner_project', con=connection)['owner_name'].drop_duplicates().tolist()
                        project_list = pd.read_sql('owner_project', con=connection)['project_num'].tolist()
                        owner_name = df.loc[df['※請填入'] == '業主名稱：'].iat[0, 1]
                        project_num = df.loc[df['※請填入'] == '專案編號：'].iat[0, 1]
                        if owner_name not in owner_list and project_num not in project_list:
                            return {"res_type": "error", "error_str": f"所填寫之業主名稱與專案編號均不存在，請先前往清單內容管理頁面設定"}
                        if owner_name not in owner_list:
                            return {"res_type": "error", "error_str": f"所填寫之業主名稱不存在，請先前往清單內容管理頁面設定"}
                        if project_num not in project_list:
                            return {"res_type": "error", "error_str": f"所填寫之專案編號不存在，請先前往清單內容管理頁面設定"}
                        else:
                            road = df.loc[df['※請填入'] == '路口名稱：'].iat[0, 1]
                            area_name = df.loc[df['※請填入'] == '行政區域：'].iat[0, 1]
                            intersection_type = str(df.loc[df['※請填入'] == '路口類型：'].iat[0, 1]).split(' ')[0]

                            # 取得日期和天候資料(不過濾重複日期) => 最少一筆，最多九筆
                            date_arr = []
                            weather_arr = []
                            day_peak_arr = []
                            day_peak_test = []
                            for idx in range(11):
                                date_ele = str(df.loc[df['※請填入'] == '日期：'].iat[0, idx + 1]).split(' ')[0]
                                weather_ele = str(df.loc[df['※請填入'] == '天候：'].iat[0, idx + 1]).split(' ')[0]
                                day_peak_ele = str(df.loc[df['藍底'] == '平日晨峰(0630-0830)'].iat[0, idx + 1]).split(' ')[0]
                                if date_ele != 'nan':
                                    date_arr.append(date_ele)
                                    day_peak_test.append(True)
                                    day_peak_arr.append(day_peak_ele)
                                else:
                                    day_peak_test.append(False)
                                if weather_ele != 'nan':
                                    weather_arr.append(weather_ele)

                            # 檢查資訊是否填寫完整
                            message_arr = []
                            type_arr = [
                                {"name": '路口名稱', "input_value": road},
                                {"name": '行政區域', "input_value": area_name},
                                {"name": '日期', "input_value": date_arr},  # 至少要填一筆
                                {"name": '路口類型', "input_value": intersection_type},
                            ]

                            # 表格有空值
                            test = {'四叉路口': 5, '五叉路口': 6, '六叉路口': 7}
                            subset = df.iloc[16:20, 1:test[intersection_type]]
                            if not subset.isna().any().any():
                                for data in type_arr:
                                    if data['name'] == '日期':
                                        if len(data['input_value']) == 0:
                                            message_arr.append(data['name'])  # 至少要填一筆
                                    else:
                                        if not isinstance(data['input_value'], str):
                                            message_arr.append(data['name'])

                                # message_arr沒有內容，代表所有內容都有填寫完整，否則需提供未填寫的內容給前端顯示
                                if len(message_arr) == 0:
                                    return {"res_type": "ok",
                                            "res_obj": {'owner_name': owner_name, 'project_num': project_num,
                                                        'tc_id': tc_id, 'road': road, 'area_name': area_name,
                                                        'date': date_arr, 'weather': weather_arr,
                                                        'day_peak': day_peak_arr,
                                                        'intersection_type': intersection_type,
                                                        'page_two_df': df, 'day_peak_test': day_peak_test
                                                        }}
                                else:
                                    return {"res_type": "error", "error_str": f"【{'、'.join(message_arr)}】未填寫完整"}
                            else:
                                return {"res_type": "error", "error_str": '請確認各方向路口填寫完整'}
                    else:
                        return {"res_type": "error", "error_str": 'TC編號填寫有誤或留有多餘空白'}
                else:
                    return {"res_type": "error", "error_str": '此範例檔為舊版，請先至範例檔案下載頁面取得最新版範例檔'}
            else:
                return {"res_type": "error", "error_str": '請檢查路口類型是否填寫正確'}
    else:
        return {"res_type": "error", "error_str": '請將資料類型設定為流量'}


# 讀取excel前兩個分頁資料並轉為json格式
def save_uploaded_data(path, page_two_data, data_type, commit):
    if data_type == 'volume':
        sheet_list = ['轉向量', '路口基本資料(IN)']
    elif data_type == 'delay':
        sheet_list = ['資料儲存', '基本資料']

    # 取得各分頁資料並轉為json格式
    data_list = []
    for sheet in sheet_list:
        # 流量第一頁(轉向量sheet) => 需將最上層pce數值拆出來儲存
        if sheet == '轉向量':
            df_org = pd.read_excel(path, sheet_name=sheet)
            # 表格資料
            df = df_org.iloc[2:]
            df.columns = df.iloc[0, 0:].tolist()
            df = df.drop(2).reset_index(drop=True)
            page_one_df = df
            # pce設定
            pce_df = df_org.iloc[0:1]
            unnamed_columns = pce_df.columns[pce_df.columns.str.contains('Unnamed')]
            pce_data = pce_df.drop(columns=unnamed_columns).to_json(force_ascii=False)
        elif sheet == '資料儲存':
            # 看情況全部存或只存有資料的區塊(如果之後負擔太重，就改成存有資料的部分)
            df = pd.read_excel(path, sheet_name=sheet)
            page_one_df = df
        else:
            # 直接取得dataframe(第二頁不再重新讀表)
            df = page_two_data['page_two_df']
            page_two_df = df
        data_list.append(df.to_json(force_ascii=False))

    # 取得分頁二中的部分資料
    owner_name = page_two_data['owner_name']
    project_num = page_two_data['project_num']
    tc_id = page_two_data['tc_id']
    road = page_two_data['road']
    intersection_type = page_two_data['intersection_type']
    if data_type == 'volume':
        date_result = page_two_data['date']  # 單個日期
        holiday_type = page_two_data['holiday_type']
    elif data_type == 'delay':
        date_arr = page_two_data['date']  # ['2024-01-06', '2024-01-07', '2024-01-08']
        date_result = '_'.join(date_arr)  # 2024-01-06_2024-01-07_2024-01-08
        day_peak = page_two_data['day_peak']

    # 存入資料
    if data_type == 'volume':
        # 如果目前上傳的tc_id/data_type/date已有相同一筆在資料表中，並且status是active => 提醒使用者先刪除再上傳(不覆蓋資料)
        with db.engine.connect() as connection:
            df = pd.read_sql('tc_uploaded_file', con=connection)
        df = df[(df['tc_id'] == tc_id) & (df['data_type'] == 'volume') & (df['status'] == 'active')]
        df['date'] = df['date'].astype(str)  # 日期轉換為字串
        df_search = df.loc[df['date'] == date_result]

        if df_search.empty:
            # 新增一筆資料
            params = {'id': str(uuid.uuid4()), 'tc_id': tc_id, 'road': road, 'data_type': data_type,
                      'date': date_result,
                      'turning_detail': data_list[0], 'basic_detail': data_list[1],
                      'intersection_type': intersection_type,
                      'update_time': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                      'date_group': '--', 'owner_name': owner_name, 'project_num': project_num,
                      'holiday_type': holiday_type,
                      'commit': commit, 'pce_data': pce_data}

            create_tc_upload_record(params)
            return {"res_type": "ok", "res_obj": {'page_one_df': page_one_df, 'page_two_df': page_two_df}}
        else:
            return {"res_type": "error", "error_str": "該筆調查資料已存在，請先刪除原資料，再重新上傳"}

    elif data_type == 'delay':
        # 如果目前上傳的tc_id/data_type/date_group已有相同一筆在資料表中，並且status是active => 提醒使用者先刪除再上傳(不覆蓋資料)
        with db.engine.connect() as connection:
            df = pd.read_sql('tc_uploaded_file', con=connection)
        df = df[(df['tc_id'] == tc_id) & (df['data_type'] == 'delay') & (df['status'] == 'active')]
        df['date_group'] = df['date_group'].astype(str)  # 日期轉換為字串
        df_search = df.loc[df['date_group'] == date_result]

        if df_search.empty:
            # 新增多筆資料(待查看是否有需要)
            for idx in range(len(date_arr)):
                params = {'id': str(uuid.uuid4()), 'tc_id': tc_id, 'road': road, 'data_type': data_type,
                          'date': date_arr[idx],
                          'turning_detail': data_list[0], 'basic_detail': data_list[1],
                          'intersection_type': intersection_type,
                          'update_time': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                          'date_group': date_result, 'owner_name': owner_name, 'project_num': project_num,
                          'holiday_type': day_peak[idx][:2],
                          'commit': commit, 'pce_data': '--'
                          }
                create_tc_upload_record(params)
            return {"res_type": "ok", "res_obj": {'page_one_df': page_one_df, 'page_two_df': page_two_df}}
        else:
            return {"res_type": "error", "error_str": "該筆調查資料已存在，請先刪除原資料，再重新上傳"}


# 其他檔案上傳(業主名稱_專案編號_備註 => 以專案編號為單位做上傳)
def save_uploaded_data_other(org_filename, commit):
    # 從檔名讀取基本資料
    owner_name = org_filename.split('_')[0]
    project_num = org_filename.split('_')[1]
    test_time = datetime.now().strftime("%Y-%m-%d")
    holiday_type = get_day_type(datetime.now())
    get_id = str(uuid.uuid4())

    # 如果目前上傳的date/data_type/project_num已有相同一筆在資料表中，就砍掉原本的資料
    params = {'id': get_id, 'tc_id': '', 'road': '', 'data_type': 'other', 'date': test_time,
              'turning_detail': '--', 'basic_detail': '--', 'pce_data': '--',
              'intersection_type': '--', 'update_time': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
              'date_group': '--', 'owner_name': owner_name, 'project_num': project_num,
              'holiday_type': holiday_type, 'commit': commit}
    # 新增一筆資料
    create_tc_upload_record(params)

    # 取得剛存入的資料
    sql = f"SELECT * FROM tc_uploaded_file WHERE id = '{get_id}'"
    with db.engine.connect() as connection:
        df = pd.read_sql_query(sql, con=connection)

        # 設定下載路徑欄位
        other_export_path = 'res/upload_record/' + org_filename
        df.at[0, 'export_excel_path'] = [other_export_path]
        db.engine.execute(f"DELETE FROM tc_uploaded_file WHERE id = '{get_id}'")
        df.to_sql('tc_uploaded_file', connection, if_exists='append', index=False, chunksize=500)


# 讀取流量excel分頁一資料並轉成固定欄位存入資料表
def save_upload_volume_turning(page_one_df_test, page_two_data):
    df = page_one_df_test
    df = df.iloc[:, 0:19]  # 不要右側的統計資料(之後會拿掉)

    # 取得分頁二中的tc_id和日期資料(存在表中來區分檔案，否則無法辨認)
    tc_id = page_two_data['tc_id']
    date = page_two_data['date']
    intersection_type = page_two_data['intersection_type']

    # column to row
    res = pd.melt(df, id_vars=['臨近路段', '起始時間', '結束時間'], var_name='name', value_name='volume')

    # 拆解/新增column
    res['type'] = res['name'].str[:-1]
    res['direction'] = res['name'].str[-1:]
    res['tc_id'] = tc_id
    res['date'] = date

    # 刪除不必要欄位
    res_delete = res.drop(labels='name', axis=1)

    # row to column
    res_after = res_delete.pivot_table(values='volume', index=['臨近路段', '起始時間', '結束時間', 'direction', 'tc_id', 'date'], columns='type', aggfunc='first').reset_index()

    # 更改column中文名稱
    rename_map = {
        "臨近路段": "start_road",
        "起始時間": "start_time",
        "結束時間": "end_time",
        "大車": "lg_car",
        "小車": "sm_car",
        "機車": "moto",
        "機車兩段": "moto_two"
    }
    res_change_col_name = res_after.rename(columns=rename_map)
    res_change_col_name = res_change_col_name.replace('-', -1)

    # 如果是五叉路口或以上
    five_road_arr = ['五叉路口', '六叉路口']
    if intersection_type in five_road_arr:
        res_change_col_name['moto_two'] = -2

    # 如果目前上傳的tc_id/date已有相同多筆在資料表中，就先砍掉原本的資料
    with db.engine.connect() as connection:
        connection.execute(text("DELETE FROM volume_turning WHERE tc_id = :tc_id AND date = :date"), 
                 {"tc_id": tc_id, "date": date})
        # connection.commit()
    
    with db.engine.connect() as connection:
        # 寫入資料表
        res_change_col_name.to_sql('volume_turning', connection, if_exists='append', index=False, chunksize=500)


# 讀取流量excel分頁二資料並轉成固定欄位存入資料表
def save_upload_volume_basic(page_two_df_test, page_two_data):
    df = page_two_df_test

    # 取得分頁二中的tc_id、路口和日期資料
    tc_id = page_two_data['tc_id']
    date = page_two_data['date']
    intersection_type = page_two_data['intersection_type']

    # 取得上面資料 => row to column
    df_top_part = pd.DataFrame(df[:15], columns=['※請填入', '黃底'])
    res = df_top_part.pivot_table(values=['黃底'], index=[], columns='※請填入', aggfunc='first').reset_index()

    # 刪除不必要欄位
    res_delete = res.drop(labels='index', axis=1)

    # 更改column中文名稱
    rename_map = {
        "業主名稱": "owner_name",
        "專案編號": "project_num",
        "TC編號：": "tc_id",
        "路口名稱：": "road",
        "行政區域：": "area",
        "日期：": "date",
        "平假日：": "holiday_type",
        "調查時段：": "investigate_time",
        "天候：": "weather",
        "路口類型：": "intersection_type"
    }
    res_change_col_name = res_delete.rename(columns=rename_map)

    # 取得表格資料
    df_table = df[15:19]
    df_table = df_table.iloc[:, 0:8]

    # row to column
    get_col = list(df_table.columns)[0:7]
    res_table = df_table.pivot_table(values=get_col, index=[], columns='※請填入', aggfunc='first').sort_values(by=['方向：']).reset_index()

    # 刪除不必要欄位&設定新欄位
    res_table_delete = res_table.drop(labels='index', axis=1)
    data_num = len(res_table_delete[res_table_delete.isna().T.all() == False])
    res_table_delete = res_table_delete.head(data_num)
    res_table_delete['index'] = 'same'

    # 防呆:當上面row to column時因為所有值都是nan而導致該column消失 => 補column
    column_list = ['方向：', '路段名：', '車道數：', '行車方向：']
    column_list_en = ['t_direction', 't_road', 't_lane_num', 't_drive_direction']
    for column in column_list:
        if column not in list(res_table_delete.columns):
            res_table_delete[column] = 'None'

    # 填寫的資料若有空值，將空值轉換為-(原設定)
    # res_table_delete.fillna('-', inplace=True)

    # 轉換成字串避免錯誤
    res_table_delete['車道數：'] = res_table_delete['車道數：'].astype(str)

    # 將資料放在同一個row
    # for idx in range(len(column_list)):
    #     res_table_delete[column_list_en[idx]] = \
    #         res_table_delete.groupby('index')[column_list[idx]].apply(', '.join).reset_index()[column_list[idx]]
    for idx in range(len(column_list)):
        grouped = res_table_delete.groupby('index')[column_list[idx]].apply(
            lambda x: ', '.join([str(v) for v in x if pd.notna(v)])
        ).reset_index()
        res_table_delete[column_list_en[idx]] = grouped[column_list[idx]]


    # 將內容新增到原先的dataframe
    for idx in range(len(column_list_en)):
        res_change_col_name[column_list_en[idx]] = res_table_delete[column_list_en[idx]]

    rename_map2 = {
        "方向：": "t_direction",
        "業主名稱：": "owner_name",
        "專案編號：": "project_num"
    }
    res_change_col_name = res_change_col_name.rename(columns=rename_map2)
    res_change_col_name = res_change_col_name.drop(labels='版本號：', axis=1)

    # 如果是五叉路口或以上
    # 1. 取得表格向下延伸內容
    # 2. 存入json存到t_for_five_up欄位
    five_road_arr = ['五叉路口', '六叉路口']
    if intersection_type in five_road_arr:
        # 不同類型會讀取不同列數
        if intersection_type == '五叉路口':
            table_extend = df[19:24]
            table_extend = table_extend.iloc[:, 0:6]
        if intersection_type == '六叉路口':
            table_extend = df[19:25]
            table_extend = table_extend.iloc[:, 0:7]
        table_extend_json = table_extend.to_json(force_ascii=False, orient='values')
        res_change_col_name['t_for_five_up'] = table_extend_json
    else:
        res_change_col_name['t_for_five_up'] = '--'

    # 如果目前上傳的tc_id/date/data_type已有相同一筆在資料表中，就先砍掉原本的資料
    with db.engine.connect() as connection:
        connection.execute(text("DELETE FROM volume_basic WHERE tc_id = :tc_id AND date = :date"), 
                 {"tc_id": tc_id, "date": date})
        # connection.commit()

    with db.engine.connect() as connection:
        # 寫入資料表
        res_change_col_name.to_sql('volume_basic', connection, if_exists='append', index=False, chunksize=500)


# 讀取延滯excel分頁一資料並轉成固定欄位存入資料表
def save_upload_delay_save(page_one_df_test, page_two_data):
    # 看情況全部存或只存有資料的區塊(如果之後負擔太重，就改成存有資料的部分)
    df = page_one_df_test

    # 取得分頁二中的tc_id和日期資料(存在表中來區分檔案，否則無法辨認)
    tc_id = page_two_data['tc_id']
    date_arr = page_two_data['date']
    date_str = '_'.join(date_arr)

    # 新增col
    test = page_two_data['day_peak_test']
    df['tc_id'] = tc_id
    df['date'] = df.apply(get_date, date=date_arr, test=test, axis=1)
    df['date_group'] = date_str

    # 更改column中文名稱
    rename_map = {
        "時段": "time_period",
        "臨近路段": "start_road",
        "開始時刻": "start_time",
        "停車在臨近車道上的車輛總數(0秒)": "car_num_0",
        "停車在臨近車道上的車輛總數(15秒)": "car_num_15",
        "停車在臨近車道上的車輛總數(30秒)": "car_num_30",
        "停車在臨近車道上的車輛總數(45秒)": "car_num_45",
        "臨近車道上的流量(總數)": "volume_all",
        "臨近車道上的流量(未受阻)": "volume_non_hinder",
        "臨近車道上的流量(受阻)": "volume_hinder"
    }
    res_change_col_name = df.rename(columns=rename_map)
    res_change_col_name = res_change_col_name.replace('-', -1)

    # 如果目前上傳的tc_id/date已有相同一筆在資料表中，就先砍掉原本的資料
    db.engine.execute(f"DELETE FROM delay_save WHERE tc_id = '{tc_id}' AND date_group = '{date_str}'")

    with db.engine.connect() as connection:
        # 寫入資料表
        res_change_col_name.to_sql('delay_save', connection, if_exists='append', index=False, chunksize=500)


# 讀取延滯excel分頁二資料並轉成固定欄位存入資料表
def save_upload_delay_basic(page_two_df_test, page_two_data):
    df = page_two_df_test

    # 取得分頁二中的tc_id、路口和日期資料
    tc_id = page_two_data['tc_id']
    day_peak = page_two_data['day_peak']
    date = page_two_data['date']
    weather = page_two_data['weather']
    date_str = '_'.join(date)

    # 取得上面資料 => row to column
    df_top_part = pd.DataFrame(df[2:15], columns=['※請填入', '藍底'])
    res = df_top_part.pivot_table(values=['藍底'], index=[], columns='※請填入', aggfunc='first').reset_index()

    print("\n" + "="*60)
    print("🔍 DEBUG: pivot_table 後的所有欄位名稱:")
    print(res.columns.tolist())
    print("="*60 + "\n")

    # 刪除不必要欄位 - 使用 errors='ignore' 避免欄位不存在時報錯
    columns_to_drop = ['index']
    # 只刪除存在的欄位
    columns_to_drop.extend([col for col in ['天候：', '日期：'] if col in res.columns])
    res_delete = res.drop(labels=columns_to_drop, axis=1, errors='ignore')

    # 更改column中文名稱
    rename_map = {
        "業主名稱：": "owner_name",
        "專案編號：": "project_num",
        "路口名稱：": "road",
        "TC編號：": "tc_id",
        "行政區域：": "area",
        "路口類型：": "intersection_type"
    }
    res_change_col_name = res_delete.rename(columns=rename_map)

    # 取得表格資料
    df_table = df[16:20]
    df_table = df_table.iloc[:, 0:14]

    # row to column
    get_col = list(df_table.columns)[0:14]
    res_table = df_table.pivot_table(values=get_col, index=[], columns='※請填入', aggfunc='first').sort_values(by=['方　向：']).reset_index()

    # 刪除不必要欄位&設定新欄位
    res_table_delete = res_table.drop(labels='index', axis=1)
    data_num = len(res_table_delete[res_table_delete.isna().T.all() == False])
    res_table_delete = res_table_delete.head(data_num)
    res_table_delete['index'] = 'same'

    # 防呆:當上面row to column時因為所有值都是nan而導致該column消失 => 補column
    column_list = ['方　向：', '路段名：', '行車方向：', '車道數：']
    column_list_en = ['t_direction', 't_road',  't_direction_2', 't_lane_num']
    for column in column_list:
        if column not in list(res_table_delete.columns):
            res_table_delete[column] = 'None'

    # 轉換成字串避免錯誤
    res_table_delete['車道數：'] = res_table_delete['車道數：'].astype(str)

    # 將資料放在同一個row
    for idx in range(len(column_list)):
        res_table_delete[column_list_en[idx]] = res_table_delete.groupby('index')[column_list[idx]].apply(', '.join).reset_index()[column_list[idx]]

    # 將內容新增到原先的dataframe
    for idx in range(len(column_list_en)):
        res_change_col_name[column_list_en[idx]] = res_table_delete[column_list_en[idx]]

    res_change_col_name['date_group'] = date_str

    # 如果目前上傳的tc_id/date/data_type已有相同一筆在資料表中，就先砍掉原本的資料
    db.engine.execute(f"DELETE FROM delay_basic WHERE tc_id = '{tc_id}' AND date_group = '{date_str}'")

    # 寫入資料表
    for ele in range(len(date)):
        res_change_col_name['date'] = date[ele]
        res_change_col_name['weather'] = weather[ele]
        res_change_col_name['day_peak'] = day_peak[ele]

        with db.engine.connect() as connection:
            res_change_col_name.to_sql('delay_basic', connection, if_exists='append', index=False, chunksize=500)


# 產生下載檔案
def generate_download_excel(page_two_data, data_type, path, test):
    # (在確定上傳後)製作excel檔的STEP
    # 方法:取得模板並寫入資料，製作出該資料的下載版excel
    # 1. 每上傳一個檔案，就從tc_uploaded_file取得該檔案的json資料
    # 2. 取得該檔案要套用的excel模板(兩層判斷:data_type/intersection_type)
    # 3. 將json檔轉為dataframe(原則上不用做任何處理)
    # 4. 將dataframe放入excel，確保數值和原本位置一樣，並可以可以操作後續頁面
    # 5. 將設定好的路徑存入資料tc_uploaded_file中該筆資料的export_excel_path欄位
    print("開始製作擋案")
    # 取得基本資料
    if data_type == 'volume':
        tc_id = page_two_data['tc_id']
        date_result = page_two_data['date']
        holiday_type = page_two_data['holiday_type']
    elif data_type == 'delay':
        tc_id = page_two_data['tc_id']
        date_arr = page_two_data['date']
        date_result = '_'.join(date_arr)

    # 1. 從tc_uploaded_file資料表取得json資料
    if data_type == 'volume':
        # 取得單筆資料
        sql = f"SELECT * FROM tc_uploaded_file WHERE status = 'active' and tc_id = '{tc_id}' and data_type = '{data_type}' and date = '{date_result}'"
    elif data_type == 'delay':
        # 得到多筆資料
        sql = f"SELECT * FROM tc_uploaded_file WHERE status = 'active' and tc_id = '{tc_id}' and data_type = '{data_type}' AND date_group = '{date_result}'"
    
    with db.engine.connect() as connection:
        df = pd.read_sql_query(text(sql), con=connection)

    # 取得索引&相關欄位資料
    intersection_type = df.at[0, 'intersection_type']
    # file_path_data = df.at[0, 'file_path']
    # date_all = file_path_data.split('_')
    # 想辦法拿到所有data_arr

    # 基本設定
    wb = []
    sheet_list = []
    column_list = []

    # 2. 取得excel模板(存放在res目錄)
    if data_type == 'volume':
        if holiday_type == '一般假日' or holiday_type == '連續假日':
            date_type_change = '假日'
        else:
            date_type_change = '平日'

    if data_type == 'volume':
        fn = f"{CFG.STATIC_FOLDER}/download_temp/volume/{intersection_type}_{date_type_change}.xlsx"
        wb = load_workbook(fn)  # 下載檔版本(模版)
        sheet_list = ['轉向量', '路口基本資料', '調查資料(OUT)']
        column_list = {'轉向量': 'turning_detail', '路口基本資料': 'basic_detail', '調查資料(OUT)': 'pce_data'}
    elif data_type == 'delay':
        fn = f"{CFG.STATIC_FOLDER}/download_temp/delay/{intersection_type}.xlsx"
        wb = load_workbook(fn)
        sheet_list = ['資料儲存', '基本資料']
        column_list = {'資料儲存': 'turning_detail', '基本資料': 'basic_detail'}

    for sheet in sheet_list:
        header = False  # 暫時設定
        ws = wb[sheet]

        # 3. 將json檔轉為dataframe
        get_data = json.loads(df.at[0, column_list[sheet]])
        df_page = pd.DataFrame.from_dict(get_data)

        # 決定是否需要header(第一頁需要)&路口基本資料需要刪掉第一項資料
        if sheet == '轉向量':  # 流量第一頁
            header = True

            # 設定時間顯示的位數
            df_page['起始時間'] = df_page['起始時間'].map(lambda x: x[0:5])
            df_page['結束時間'] = df_page['結束時間'].map(lambda x: x[0:5])

            # 正式檔案不會有右側資料(之後拿掉)
            if intersection_type == '正交四叉路口':
                df_page = df_page.iloc[:, 0:19]
            elif intersection_type == '五叉路口':
                df_page = df_page.iloc[:, 0:18]
        elif sheet == '資料儲存':  # 延滯第一頁
            header = True

            # 設定時間顯示的位數
            df_page['開始時刻'] = df_page['開始時刻'].map(lambda x: x[0:5])
        elif sheet == '路口基本資料':  # 流量第二頁
            header = False

            # 取得模板上的機車兩段式左轉資料
            moto_left = []
            for i in range(10):
                value = ws[chr(i + 65) + str(18)].value
                moto_left.append(value)
            # list to dataframe
            df_left = pd.DataFrame(moto_left).T

            # 修改dataframe範圍和日期格式
            df_page = df_page.iloc[:, 0:10]
            df_page.iloc[9, 1] = str(date_result).replace('-', '/')

            # 不取業主名稱欄位以上資料
            df1 = pd.DataFrame(df_page[2: 19])
            df2 = pd.DataFrame(df_page[19:])
            df_none = pd.DataFrame([[None] * 10])

            # 是否加入機車兩段式左轉資料 => (合併dataframe)
            five_road_arr = ['五叉路口', '六叉路口']
            if intersection_type in five_road_arr:
                df_page = pd.DataFrame(np.concatenate((df1.values, df2.values), axis=0))
            else:
                df_page = pd.DataFrame(np.concatenate((df1.values, df_left.values, df_none, df2.values), axis=0))
        elif sheet == '基本資料':  # 延滯第二頁
            header = False

            # 修改dataframe範圍和日期格式
            df_page = df_page.iloc[:, 0:12]
            df_page = df_page[1:20]

            for i in range(11):
                if test['day_peak_test'][i]:
                    time = df_page.iloc[9, i + 1] / 1000
                    res = datetime.utcfromtimestamp(time).strftime('%Y-%m-%d')
                    df_page.iloc[9, i + 1] = res
                else:
                    df_page.iloc[9, i + 1] = ''

            # 待優化
            data = []
            data.insert(0, {'※請填入': None, '藍底': None})
            data.insert(0, {'※請填入': None, '藍底': None})

            df_page = pd.concat([pd.DataFrame(data), df_page], ignore_index=True)
            df_page = df_page[0: 21]

        # 4. 將dataframe存入excel
        rows = dataframe_to_rows(df_page, index=False, header=header)
        for r_idx, row in enumerate(rows, 1):
            for c_idx, value in enumerate(row, 1):
                ws.cell(row=r_idx, column=c_idx, value=value)

        # 5. 設定第三頁PCE數值(測試中待調整)
        if sheet == '調查資料(OUT)':
            get_pce_data = json.loads(df.at[0, column_list[sheet]])
            df_pce = pd.DataFrame.from_dict(get_pce_data)
            if intersection_type == '正交四叉路口':
                rows = dataframe_to_rows(df_pce, index=False, header=header)
                for r_idx, row in enumerate(rows, 1):
                    for c_idx, value in enumerate(row, 11):
                        ws.cell(row=r_idx, column=c_idx, value=value)
                    for c_idx, value in enumerate(row, 21):
                        ws.cell(row=r_idx, column=c_idx, value=value)
                    for c_idx, value in enumerate(row, 31):
                        ws.cell(row=r_idx, column=c_idx, value=value)
            elif intersection_type in ['五叉路口', '六叉路口']:
                sql = f"SELECT * FROM volume_basic WHERE tc_id = '{tc_id}' AND date = '{date_result}'"
                with db.engine.connect() as connection:
                    df_test = pd.read_sql_query(text(sql), con=connection)
                test_data = []  # 改為空列表
                if not df_test.empty and 't_for_five_up' in df_test.columns:
                    try:
                        json_value = df_test.iloc[0]['t_for_five_up']
                        if pd.notna(json_value) and json_value not in ['', '--', 'None']:
                            parsed = json.loads(str(json_value))
                            # 確保是列表格式
                            if isinstance(parsed, list):
                                test_data = parsed
                            elif isinstance(parsed, dict):
                                test_data = [parsed]
                    except (json.JSONDecodeError, ValueError, KeyError) as e:
                        print(f"解析 t_for_five_up 失敗: {e}")
                        test_data = []

                # 查詢值後，將該值設定到正確欄位(待優化)
                if intersection_type == '五叉路口':
                    car_type = ['大車', '大車', '大車', '大車', '小車', '小車', '小車', '小車', '機車', '機車', '機車', '機車']
                    type_A = [2, 3, 4, 5, 2, 3, 4, 5, 2, 3, 4, 5]
                    type_B = [1, 3, 4, 5, 1, 3, 4, 5, 1, 3, 4, 5]
                    type_C = [1, 2, 4, 5, 1, 2, 4, 5, 1, 2, 4, 5]
                    type_D = [1, 2, 3, 5, 1, 2, 3, 5, 1, 2, 3, 5]
                    type_E = [1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4]

                    for i in range(12):
                        ws.cell(row=1, column=i+2, value=df_pce[f"{car_type[i]}{test_data[0][type_A[i]]}"][0])  # A方向
                        ws.cell(row=1, column=i+14, value=df_pce[f"{car_type[i]}{test_data[1][type_B[i]]}"][0])  # B方向
                        ws.cell(row=1, column=i+26, value=df_pce[f"{car_type[i]}{test_data[2][type_C[i]]}"][0])  # C方向
                        ws.cell(row=1, column=i+38, value=df_pce[f"{car_type[i]}{test_data[3][type_D[i]]}"][0])  # D方向
                        ws.cell(row=1, column=i+50, value=df_pce[f"{car_type[i]}{test_data[4][type_E[i]]}"][0])  # E方向

                elif intersection_type == '六叉路口':
                    car_type = ['大車', '大車', '大車', '大車', '大車', '小車', '小車', '小車', '小車', '小車', '機車', '機車', '機車', '機車', '機車']
                    type_A = [2, 3, 4, 5, 6, 2, 3, 4, 5, 6, 2, 3, 4, 5, 6]
                    type_B = [1, 3, 4, 5, 6, 1, 3, 4, 5, 6, 1, 3, 4, 5, 6]
                    type_C = [1, 2, 4, 5, 6, 1, 2, 4, 5, 6, 1, 2, 4, 5, 6]
                    type_D = [1, 2, 3, 5, 6, 1, 2, 3, 5, 6, 1, 2, 3, 5, 6]
                    type_E = [1, 2, 3, 4, 6, 1, 2, 3, 4, 6, 1, 2, 3, 4, 6]
                    type_F = [1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5]

                    # for i in range(15):
                    #     ws.cell(row=1, column=i + 2, value=df_pce[f"{car_type[i]}{test_data[0][type_A[i]]}"][0])  # A方向
                    #     ws.cell(row=1, column=i + 17, value=df_pce[f"{car_type[i]}{test_data[1][type_B[i]]}"][0])  # B方向
                    #     ws.cell(row=1, column=i + 32, value=df_pce[f"{car_type[i]}{test_data[2][type_C[i]]}"][0])  # C方向
                    #     ws.cell(row=1, column=i + 47, value=df_pce[f"{car_type[i]}{test_data[3][type_D[i]]}"][0])  # D方向
                    #     ws.cell(row=1, column=i + 62, value=df_pce[f"{car_type[i]}{test_data[4][type_E[i]]}"][0])  # E方向
                    #     ws.cell(row=1, column=i + 77, value=df_pce[f"{car_type[i]}{test_data[5][type_F[i]]}"][0])  # F方向

                    if len(test_data) >= 6:
                        for i in range(15):
                            try:
                                # A方向
                                if type_A[i] in test_data[0]:
                                    col_name = f"{car_type[i]}{test_data[0][type_A[i]]}"
                                    if col_name in df_pce.columns and len(df_pce) > 0:
                                        ws.cell(row=1, column=i+2, value=df_pce[col_name][0])
                                
                                # B方向
                                if type_B[i] in test_data[1]:
                                    col_name = f"{car_type[i]}{test_data[1][type_B[i]]}"
                                    if col_name in df_pce.columns and len(df_pce) > 0:
                                        ws.cell(row=1, column=i+17, value=df_pce[col_name][0])
                                
                                # C方向
                                if type_C[i] in test_data[2]:
                                    col_name = f"{car_type[i]}{test_data[2][type_C[i]]}"
                                    if col_name in df_pce.columns and len(df_pce) > 0:
                                        ws.cell(row=1, column=i+32, value=df_pce[col_name][0])
                                
                                # D方向
                                if type_D[i] in test_data[3]:
                                    col_name = f"{car_type[i]}{test_data[3][type_D[i]]}"
                                    if col_name in df_pce.columns and len(df_pce) > 0:
                                        ws.cell(row=1, column=i+47, value=df_pce[col_name][0])
                                
                                # E方向
                                if type_E[i] in test_data[4]:
                                    col_name = f"{car_type[i]}{test_data[4][type_E[i]]}"
                                    if col_name in df_pce.columns and len(df_pce) > 0:
                                        ws.cell(row=1, column=i+62, value=df_pce[col_name][0])
                                
                                # F方向
                                if type_F[i] in test_data[5]:
                                    col_name = f"{car_type[i]}{test_data[5][type_F[i]]}"
                                    if col_name in df_pce.columns and len(df_pce) > 0:
                                        ws.cell(row=1, column=i+77, value=df_pce[col_name][0])
                                        
                            except (IndexError, KeyError, TypeError) as e:
                                print(f"六叉路口第 {i} 個儲存格寫入錯誤: {e}")
                                # 寫入空值或預設值
                                ws.cell(row=1, column=i+2, value='')
                                ws.cell(row=1, column=i+17, value='')
                                ws.cell(row=1, column=i+32, value='')
                                ws.cell(row=1, column=i+47, value='')
                                ws.cell(row=1, column=i+62, value='')
                                ws.cell(row=1, column=i+77, value='')
                    else:
                        print(f"警告：test_data 資料不足，需要 6 筆但只有 {len(test_data)} 筆")

    save_path = f"export/{data_type}/{tc_id}"

    # 存檔
    if data_type == 'volume':
        file_name = f"{tc_id}_{date_result}_{data_type}_下載檔.xlsx"
        file_name_v2 = f"{tc_id}_{date_result}_{data_type}_上傳檔.xlsx"
    elif data_type == 'delay':
        # 測試用
        file_update_time = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        file_name = f"{tc_id}_{file_update_time}_{data_type}_下載檔.xlsx"
        file_name_v2 = f"{tc_id}_{file_update_time}_{data_type}_上傳檔.xlsx"

        # 理論上要這樣設定，但是好像會有字串過長的問題(待優化)
        # file_name = f"{tc_id}_{date_result}_{data_type}_下載檔.xlsx"
        # file_name_v2 = f"{tc_id}_{date_result}_{data_type}_上傳檔.xlsx"

    # 檢查目錄是否存在，若不存在則創建目錄
    if not os.path.isdir(f"{CFG.STATIC_FOLDER}/{save_path}"):
        os.makedirs(f"{CFG.STATIC_FOLDER}/{save_path}")

    # 將excel下載路徑存到tc_uploaded_file
    if data_type == 'volume':
        # 如果是volume就只有一筆要設定
        export_path = f"{CFG.STATIC_FOLDER}/{save_path}/{file_name}"
        export_path_v2 = f"{CFG.STATIC_FOLDER}/{save_path}/{file_name_v2}"
        wb.save(export_path)  # 下載檔
        shutil.copyfile(path, export_path_v2)  # 上傳檔(複製/改名/存取)
        df.at[0, 'export_excel_path'] = [export_path, export_path_v2]  # 下載檔0,上傳檔1

        # 如果目前上傳的tc_id/date/data_type已有相同一筆在資料表中，就砍掉原本的資料
        with db.engine.connect() as connection:
            connection.execute(text("DELETE FROM tc_uploaded_file WHERE tc_id = :tc_id AND data_type = :data_type AND date = :date"), 
                 {"tc_id": tc_id, "data_type": data_type, "date": date_result})
            # connection.commit()

        with db.engine.connect() as connection:
            df.to_sql('tc_uploaded_file', connection, if_exists='append', index=False, chunksize=500)

        # 改成檔案上傳時 直接轉換
        try:
            file_transfer_volume(df)
        except:
            print('檔案轉換錯誤')

    elif data_type == 'delay':
        # 如果目前上傳的tc_id/date/data_type已有相同一筆在資料表中，就砍掉原本的資料
        db.engine.execute(text("DELETE FROM tc_uploaded_file WHERE tc_id = :tc_id AND data_type = :data_type AND date_group = :date_result"), params={'tc_id': tc_id, 'data_type': data_type, 'date_result': date_result})

        for idx in range(len(date_arr)):
            export_path = f"{CFG.STATIC_FOLDER}/{save_path}/{file_name}"
            export_path_v2 = f"{CFG.STATIC_FOLDER}/{save_path}/{file_name_v2}"
            wb.save(export_path)  # 下載檔
            shutil.copyfile(path, export_path_v2)  # 上傳檔(複製/改名/存取)
            df.at[idx, 'export_excel_path'] = [export_path, export_path_v2]  # 下載檔0,上傳檔1

        with db.engine.connect() as connection:
            df.to_sql('tc_uploaded_file', connection, if_exists='append', index=False, chunksize=500)
        
        # 改成檔案上傳時 直接轉換
        try:
            file_transfer_delay(df)
        except Exception as e:
            print(f'檔案轉換錯誤: {type(e).__name__}: {str(e)}')
            import traceback
            traceback.print_exc()
        
    res = response_with(resp.SUCCESS_200, value={"message": "ok"})
    return res


def file_transfer_volume(df_file):
    # 最終回傳
    output_final = dict()
    output_final['skipping'] = []
    output_final['noFileError'] = []

    # 所有時間點建立 00:00 ~ 23:45
    start_time = 0 * 60
    end_time = 23 * 60 + 45
    time_list = []
    current_time = start_time
    while current_time <= end_time:
        hours = current_time // 60
        minutes = current_time % 60
        time_string = f"{hours:02d}:{minutes:02d}"
        time_list.append(time_string)
        current_time += 15

    # 測試用
    # time_list = time_list[0:93]

    for index, row in df_file.iterrows():
        system = platform.system()
        if system.lower() == "linux":
            excel_file_origin = row['export_excel_path'][0]  # 取得第一個檔案(下載檔版本)
            excel_file_convert = excel_file_origin.replace(".xlsx", "_convert.xlsx")

            if os.path.exists(excel_file_convert):
                print(f"{excel_file_convert} 已存在")
            else:
                command = f"ssconvert {excel_file_origin} {excel_file_convert} --recalc"
                try:
                    subprocess.run(command, shell=True, check=True)
                    print("ssconvert success")
                except subprocess.CalledProcessError as e:
                    print("ssconvert failed:", e)
                    print("大概是沒檔案")
                    output_final['noFileError'].append(row['tc_id'])
                    continue

            if os.path.exists(excel_file_convert):
                excel_file = excel_file_convert
        else:
            # print('本機測試')
            excel_file_origin = row['export_excel_path'][0]  # 取得第一個檔案(下載檔版本)
            excel_file = excel_file_origin.replace(".xlsx", "_convert.xlsx")

        # STEP1: 讀取路口基本資料Sheet
        sheet_name = '路口基本資料'
        
        try:
            df = pd.read_excel(excel_file, sheet_name, header=None)
        except:
            continue

        # 取得TC編號
        row_index = df.index[df.eq('TC編號：').any(axis=1)][0]
        tc_id = df.iloc[row_index, 1]

        # 取得平假日
        row_index = df.index[df.eq('平假日：').any(axis=1)][0]
        is_holiday = df.iloc[row_index, 1]

        # 取得方向
        row_index = df.index[df.eq('方向：').any(axis=1)][0]
        combine_list_1 = []
        for x in df.iloc[row_index]:
            if pd.notna(x):
                combine_list_1.append(x)
            else:
                break
        combine_df_1 = pd.DataFrame(combine_list_1)
        
        # 取得路段名
        row_index = df.index[df.eq('路段名：').any(axis=1)][0]
        combine_list_2 = []
        for x in df.iloc[row_index]:
            if pd.notna(x):
                combine_list_2.append(x)
            else:
                break
        combine_df_2 = pd.DataFrame(combine_list_2)

        # 取得行車方向
        row_index = df.index[df.eq('行車方向：').any(axis=1)][0]
        combine_list_3 = []
        for x in df.iloc[row_index]:
            if pd.notna(x):
                combine_list_3.append(x)
            else:
                break
        combine_df_3 = pd.DataFrame(combine_list_3)
        
        res = pd.concat([combine_df_1, combine_df_2, combine_df_3], axis=1, ignore_index=True)

        res.columns = res.iloc[0]
        res = res[1:]
        res['新鍵'] = res['路段名：'] + res['行車方向：']
        road_name_direction = dict(zip(res['方向：'], res['新鍵']))

        # STEP2: 讀取PHF及轉向比Sheet
        sheet_name = 'PHF及轉向比'
        df2 = pd.read_excel(excel_file, sheet_name, header=None)

        # 1.抓取每小時交通量(找到第三行，抓取'交通量'位置)
        want_row_1 = 2
        want_value_1 = '交通量'
        column_index_1 = df2.iloc[[want_row_1]].columns[df2.iloc[[want_row_1]].eq(want_value_1).any(axis=0)][0]
        
        # 檢查'交通量'往上一格是否為每小時，是則抓取同欄的4~97行資料
        if df2.iloc[(want_row_1 - 1), column_index_1] == '每小時':
            output_1_list_temp = []
            for x in df2.iloc[4:97, column_index_1]:
                output_1_list_temp.append(x)

        # 2.抓取轉向量(找到第三行，抓取所有'小計'位置)
        want_row_2 = 2
        want_value_2 = '小計'
        # 列表包含的值
        my_list = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
        column_index_2_arr = df2.iloc[[want_row_2]].columns[df2.iloc[[want_row_2]].eq(want_value_2).any(axis=0)]

        output_2 = {}
        
        for x in column_index_2_arr:
            # 從上一步'交通量'位置開始
            if x > column_index_1:   
                # 排除nan
                if pd.notna(df2.iloc[(want_row_2 - 2), x]):
                    # 有順序的讀下去
                    if any(item in df2.iloc[(want_row_2 - 2), x] for item in my_list):
                        from_dir = ''.join(filter(str.isupper, df2.iloc[(want_row_2 - 2), x]))
                        output_2[from_dir] = {}
                    
                if from_dir in output_2:
                    to_dir = ''.join(filter(str.isupper, df2.iloc[(want_row_2 - 1), x]))
                    check_dir = df2.iloc[(want_row_2 - 1), x]

                    if to_dir != '':
                        if is_holiday == '平日':  # 讀取四筆內容
                            output_2[from_dir][to_dir] = {
                                'morning_peak': df2.iloc[97, x],       # 晨峰
                                'morning_off_peak': df2.iloc[99, x],   # 白天離峰
                                'evening_off_peak': df2.iloc[100, x],  # 夜間離峰(前端不使用)
                                'evening_peak': df2.iloc[98, x],       # 昏峰
                                }
                        elif is_holiday in ['一般假日', '連續假日']:  # 讀取三筆內容
                            output_2[from_dir][to_dir] = {
                                'morning_peak': df2.iloc[97, x],       # 晨峰
                                'off_peak': df2.iloc[98, x],           # 離峰
                                'evening_peak': df2.iloc[99, x]        # 昏峰
                                }
                    # 非常非常特例(暫時不用)
                    else:
                        if '三叉' in row['intersection_type']:
                            if check_dir == "直行":
                                if is_holiday == "平日":
                                    output_2[from_dir]['B'] = {
                                        "morning_peak": df2.iloc[68, x],
                                        "evening_peak": df2.iloc[69, x],
                                        "morning_off_peak": df2.iloc[70, x],
                                        "evening_off_peak": df2.iloc[71, x],
                                        }
                                else:
                                    output_2[from_dir]['B'] = {
                                        "peak": df2.iloc[68, x],
                                        "off_peak": df2.iloc[69, x],
                                        }
                            
                            if check_dir == "右轉":
                                if is_holiday == "平日":
                                    output_2[from_dir]['C'] = {
                                        "morning_peak": df2.iloc[68, x],
                                        "evening_peak": df2.iloc[69, x],
                                        "morning_off_peak": df2.iloc[70, x],
                                        "evening_off_peak": df2.iloc[71, x],
                                        }
                                else:
                                    output_2[from_dir]['C'] = {
                                        "peak": df2.iloc[68, x],
                                        "off_peak": df2.iloc[69, x],
                                        }

        
        # STEP3: 讀取流量分布圖Sheet
        sheet_name = '流量分布圖'
        df3 = pd.read_excel(excel_file, sheet_name, header=None)
        

        if has_nan(output_2) | any(math.isnan(x) for x in output_1_list_temp):
            output_final['skipping'].append(row['tc_id'])
        else:
            output_final[row['tc_id']] = {
                "road_name": row['road'],
                "turning_data": output_2,
                "volume_data": {},
                "turning_config_data": {
                    'road': row['road'],
                    'intersection_type': row['intersection_type'],
                    'road_groups': {},
                    'turning_config': {},
                },
                "output_1_list_temp":output_1_list_temp,
                "road_name_direction":road_name_direction,
                "df3":df3.to_dict("records")
            }

        result_dict = replace_nan_with_string(output_final)
        
        excel_data = json.dumps(result_dict[row['tc_id']])
        sql_str = f'''
        UPDATE public.tc_uploaded_file
        SET excel_data='{excel_data}'
        WHERE tc_id='{row['tc_id']}' and data_type='{row['data_type']}' and "date"='{row['date']}';
        '''
        db.engine.execute(text(sql_str))


def file_transfer_delay(df_file):
    # 最終回傳
    output_final = dict()
    output_final['skipping'] = []
    output_final['noFileError'] = []

    # 所有時間點建立 06:00 ~ 21:45
    start_time = 6 * 60
    end_time = 21 * 60 + 45
    time_list = []
    current_time = start_time
    while current_time <= end_time:
        hours = current_time // 60
        minutes = current_time % 60
        time_string = f"{hours:02d}:{minutes:02d}"
        time_list.append(time_string)
        current_time += 15

    # 測試用
    # time_list = time_list[0:93]

    # 初始化output_1
    output_1 = {}
    output_1_list = [0] * len(time_list)

    for index, row in df_file.iterrows():
        try:
            system = platform.system()
            if system.lower() == "linux":
                excel_file_origin = row['export_excel_path'][0]  # 取得第一個檔案(下載檔版本)
                excel_file_convert = excel_file_origin.replace(".xlsx", "_convert.xlsx")

                if os.path.exists(excel_file_convert):
                    print(f"{excel_file_convert} 已存在")
                else:
                    command = f"ssconvert {excel_file_origin} {excel_file_convert} --recalc"
                    try:
                        subprocess.run(command, shell=True, check=True)
                        print("ssconvert success")
                    except subprocess.CalledProcessError as e:
                        print("ssconvert failed:", e)
                        print("大概是沒檔案")
                        output_final['noFileError'].append(row['tc_id'])
                        continue

                if os.path.exists(excel_file_convert):
                    excel_file = excel_file_convert
            else:
                # print('本機測試')
                excel_file_origin = row['export_excel_path'][0]  # 取得第一個檔案(下載檔版本)
                excel_file = excel_file_origin.replace(".xlsx", "_convert.xlsx")

            # STEP1: 讀取基本資料Sheet
            sheet_name = "基本資料"
            df = pd.read_excel(excel_file, sheet_name, header=None)

            # 取得方向
            row_index = df.index[df.eq('方　向：').any(axis=1)]
            
            # 🔧 修復: 檢查是否找到資料
            if len(row_index) == 0:
                print(f"警告: TC ID {row['tc_id']} 找不到'方　向：'資料")
                output_final['skipping'].append(row['tc_id'])
                continue
            
            row_index = row_index[0]
            combine_list_1 = []
            for x in df.iloc[row_index]:
                if pd.notna(x):
                    combine_list_1.append(x)
                else:
                    break
            
            # 🔧 修復: 檢查是否有足夠資料
            if len(combine_list_1) == 0:
                print(f"警告: TC ID {row['tc_id']} 方向資料為空")
                output_final['skipping'].append(row['tc_id'])
                continue
                
            combine_df_1 = pd.DataFrame(combine_list_1)

            # ... 其他處理邏輯 (路段名、行車方向等) ...
            
            # 取得路段名
            row_index = df.index[df.eq('路段名：').any(axis=1)]
            if len(row_index) == 0:
                print(f"警告: TC ID {row['tc_id']} 找不到'路段名：'資料")
                output_final['skipping'].append(row['tc_id'])
                continue
            row_index = row_index[0]
            combine_list_2 = []
            for x in df.iloc[row_index]:
                if pd.notna(x):
                    combine_list_2.append(x)
                else:
                    break
            if len(combine_list_2) == 0:
                print(f"警告: TC ID {row['tc_id']} 路段名資料為空")
                output_final['skipping'].append(row['tc_id'])
                continue
            combine_df_2 = pd.DataFrame(combine_list_2)

            # 取得行車方向
            row_index = df.index[df.eq('行車方向：').any(axis=1)]
            if len(row_index) == 0:
                print(f"警告: TC ID {row['tc_id']} 找不到'行車方向：'資料")
                output_final['skipping'].append(row['tc_id'])
                continue
            row_index = row_index[0]
            combine_list_3 = []
            for x in df.iloc[row_index]:
                if pd.notna(x):
                    combine_list_3.append(x)
                else:
                    break
            if len(combine_list_3) == 0:
                print(f"警告: TC ID {row['tc_id']} 行車方向資料為空")
                output_final['skipping'].append(row['tc_id'])
                continue
            combine_df_3 = pd.DataFrame(combine_list_3)

            res = pd.concat([combine_df_1, combine_df_2, combine_df_3], axis=1, ignore_index=True)
            res.columns = res.iloc[0]
            res = res[1:]
            res['新鍵'] = res['路段名：'] + res['行車方向：']
            road_name_direction = dict(zip(res['方　向：'], res['新鍵']))

            # STEP2: 讀取料分析Sheet
            sheet_name = '資料分析'
            df1 = pd.read_excel(excel_file, sheet_name, header=None)

            output_1 = {}

            # 平日晨峰
            want_row_1 = 0
            want_value_1 = '平日晨峰(0630-0830)'
            # 列表包含的值
            column_index_1 = df1.iloc[[want_row_1]].columns[df1.iloc[[want_row_1]].eq(want_value_1).any(axis=0)][0]

            want_value_2 = '平日晨峰(07-09)'
            # 列表包含的值
            column_index_2 = df1.iloc[[want_row_1]].columns[df1.iloc[[want_row_1]].eq(want_value_2).any(axis=0)][0]

            want_value_3 = '平日中午(11-13)'
            # 列表包含的值
            column_index_3 = df1.iloc[[want_row_1]].columns[df1.iloc[[want_row_1]].eq(want_value_3).any(axis=0)][0]

            want_value_4 = '平日中午(12-14)'
            # 列表包含的值
            column_index_4 = df1.iloc[[want_row_1]].columns[df1.iloc[[want_row_1]].eq(want_value_4).any(axis=0)][0]

            want_value_5 = '平日昏峰(17-19)'
            # 列表包含的值
            column_index_5 = df1.iloc[[want_row_1]].columns[df1.iloc[[want_row_1]].eq(want_value_5).any(axis=0)][0]

            want_value_6 = '假日(11-12)'
            # 列表包含的值
            column_index_6 = df1.iloc[[want_row_1]].columns[df1.iloc[[want_row_1]].eq(want_value_6).any(axis=0)][0]

            want_value_7 = '假日(1430-1530)'
            # 列表包含的值
            column_index_7 = df1.iloc[[want_row_1]].columns[df1.iloc[[want_row_1]].eq(want_value_7).any(axis=0)][0]

            want_value_8 = '假日(1730-1830)'
            # 列表包含的值
            column_index_8 = df1.iloc[[want_row_1]].columns[df1.iloc[[want_row_1]].eq(want_value_8).any(axis=0)][0]

            want_value_9 = '假日(16-18)'
            # 列表包含的值
            column_index_9 = df1.iloc[[want_row_1]].columns[df1.iloc[[want_row_1]].eq(want_value_9).any(axis=0)][0]

            want_value_10 = '假日(17-19)'
            # 列表包含的值
            column_index_10 = df1.iloc[[want_row_1]].columns[df1.iloc[[want_row_1]].eq(want_value_10).any(axis=0)][0]

            want_value_11 = '假日(16-20)'
            # 列表包含的值
            column_index_11 = df1.iloc[[want_row_1]].columns[df1.iloc[[want_row_1]].eq(want_value_11).any(axis=0)][0]

            row_index_arr = df1.index[df1.eq('時間').any(axis=1)]

            for key, value in road_name_direction.items():
                if value == "--":
                    continue

                output_1[key] = {}
                output_1[key]['data'] = {}
                output_1[key]['data_holiday'] = {}

                for index, item in enumerate(time_list):
                    # 因為移動窗格的關係只剩下61個值
                    if index < 61:
                        output_1[key]['data'][item] = 'NaN'
                        output_1[key]['data_holiday'][item] = 'NaN'

            for x in row_index_arr:
                key = df1.iloc[x - 1, column_index_1][0]
                if key not in combine_list_1[1:]:
                    continue

                # 暴力(待優化)
                # 平日晨峰(0630-0830)
                output_1[key]['data'][df1.iloc[x + 1, column_index_1][0:5]] = df1.iloc[x + 1, column_index_1 + 1]
                output_1[key]['data'][df1.iloc[x + 2, column_index_1][0:5]] = df1.iloc[x + 2, column_index_1 + 1]
                output_1[key]['data'][df1.iloc[x + 3, column_index_1][0:5]] = df1.iloc[x + 3, column_index_1 + 1]
                output_1[key]['data'][df1.iloc[x + 4, column_index_1][0:5]] = df1.iloc[x + 4, column_index_1 + 1]
                output_1[key]['data'][df1.iloc[x + 5, column_index_1][0:5]] = df1.iloc[x + 5, column_index_1 + 1]

                # 平日晨峰(07-09)
                output_1[key]['data'][df1.iloc[x + 1, column_index_2][0:5]] = df1.iloc[x + 1, column_index_2 + 1]
                output_1[key]['data'][df1.iloc[x + 2, column_index_2][0:5]] = df1.iloc[x + 2, column_index_2 + 1]
                output_1[key]['data'][df1.iloc[x + 3, column_index_2][0:5]] = df1.iloc[x + 3, column_index_2 + 1]
                output_1[key]['data'][df1.iloc[x + 4, column_index_2][0:5]] = df1.iloc[x + 4, column_index_2 + 1]
                output_1[key]['data'][df1.iloc[x + 5, column_index_2][0:5]] = df1.iloc[x + 5, column_index_2 + 1]

                # 平日中午(11-13)
                output_1[key]['data'][df1.iloc[x + 1, column_index_3][0:5]] = df1.iloc[x + 1, column_index_2 + 1]
                output_1[key]['data'][df1.iloc[x + 2, column_index_3][0:5]] = df1.iloc[x + 2, column_index_3 + 1]
                output_1[key]['data'][df1.iloc[x + 3, column_index_3][0:5]] = df1.iloc[x + 3, column_index_3 + 1]
                output_1[key]['data'][df1.iloc[x + 4, column_index_3][0:5]] = df1.iloc[x + 4, column_index_3 + 1]
                output_1[key]['data'][df1.iloc[x + 5, column_index_3][0:5]] = df1.iloc[x + 5, column_index_3 + 1]

                # 平日中午(12-14)
                output_1[key]['data'][df1.iloc[x + 1, column_index_4][0:5]] = df1.iloc[x + 1, column_index_4 + 1]
                output_1[key]['data'][df1.iloc[x + 2, column_index_4][0:5]] = df1.iloc[x + 2, column_index_4 + 1]
                output_1[key]['data'][df1.iloc[x + 3, column_index_4][0:5]] = df1.iloc[x + 3, column_index_4 + 1]
                output_1[key]['data'][df1.iloc[x + 4, column_index_4][0:5]] = df1.iloc[x + 4, column_index_4 + 1]
                output_1[key]['data'][df1.iloc[x + 5, column_index_4][0:5]] = df1.iloc[x + 5, column_index_4 + 1]

                # 平日昏峰(17-19)
                output_1[key]['data_holiday'][df1.iloc[x + 1, column_index_5][0:5]] = df1.iloc[x + 1, column_index_5 + 1]
                # output_1[key]['data_holiday'][df1.iloc[x + 2, column_index_5][0:5]] = df1.iloc[x + 2, column_index_5 + 1]
                # output_1[key]['data_holiday'][df1.iloc[x + 3, column_index_5][0:5]] = df1.iloc[x + 3, column_index_5 + 1]
                # output_1[key]['data_holiday'][df1.iloc[x + 4, column_index_5][0:5]] = df1.iloc[x + 4, column_index_5 + 1]
                # output_1[key]['data_holiday'][df1.iloc[x + 5, column_index_5][0:5]] = df1.iloc[x + 5, column_index_5 + 1]

                # 假日(11-12)
                output_1[key]['data_holiday'][df1.iloc[x + 1, column_index_6][0:5]] = df1.iloc[x + 1, column_index_6 + 1]
                # output_1[key]['data_holiday'][df1.iloc[x + 2, column_index_6][0:5]] = df1.iloc[x + 2, column_index_6 + 1]
                # output_1[key]['data_holiday'][df1.iloc[x + 3, column_index_6][0:5]] = df1.iloc[x + 3, column_index_6 + 1]
                # output_1[key]['data_holiday'][df1.iloc[x + 4, column_index_6][0:5]] = df1.iloc[x + 4, column_index_6 + 1]
                # output_1[key]['data_holiday'][df1.iloc[x + 5, column_index_6][0:5]] = df1.iloc[x + 5, column_index_6 + 1]

                # 假日(1430-1530)
                output_1[key]['data_holiday'][df1.iloc[x + 1, column_index_7][0:5]] = df1.iloc[x + 1, column_index_7 + 1]
                # output_1[key]['data_holiday'][df1.iloc[x + 2, column_index_7][0:5]] = df1.iloc[x + 2, column_index_7 + 1]
                # output_1[key]['data_holiday'][df1.iloc[x + 3, column_index_7][0:5]] = df1.iloc[x + 3, column_index_7 + 1]
                # output_1[key]['data_holiday'][df1.iloc[x + 4, column_index_7][0:5]] = df1.iloc[x + 4, column_index_7 + 1]
                # output_1[key]['data_holiday'][df1.iloc[x + 5, column_index_7][0:5]] = df1.iloc[x + 5, column_index_7 + 1]

                # 假日(1730-1830)
                output_1[key]['data_holiday'][df1.iloc[x + 1, column_index_8][0:5]] = df1.iloc[x + 1, column_index_8 + 1]
                output_1[key]['data_holiday'][df1.iloc[x + 2, column_index_8][0:5]] = df1.iloc[x + 2, column_index_8 + 1]
                output_1[key]['data_holiday'][df1.iloc[x + 3, column_index_8][0:5]] = df1.iloc[x + 3, column_index_8 + 1]
                output_1[key]['data_holiday'][df1.iloc[x + 4, column_index_8][0:5]] = df1.iloc[x + 4, column_index_8 + 1]
                output_1[key]['data_holiday'][df1.iloc[x + 5, column_index_8][0:5]] = df1.iloc[x + 5, column_index_8 + 1]

                # 假日(16-18)
                output_1[key]['data_holiday'][df1.iloc[x + 1, column_index_9][0:5]] = df1.iloc[x + 1, column_index_9 + 1]
                output_1[key]['data_holiday'][df1.iloc[x + 2, column_index_9][0:5]] = df1.iloc[x + 2, column_index_9 + 1]
                output_1[key]['data_holiday'][df1.iloc[x + 3, column_index_9][0:5]] = df1.iloc[x + 3, column_index_9 + 1]
                output_1[key]['data_holiday'][df1.iloc[x + 4, column_index_9][0:5]] = df1.iloc[x + 4, column_index_9 + 1]
                output_1[key]['data_holiday'][df1.iloc[x + 5, column_index_9][0:5]] = df1.iloc[x + 5, column_index_9 + 1]

                # 假日(17-19)
                output_1[key]['data_holiday'][df1.iloc[x + 1, column_index_10][0:5]] = df1.iloc[x + 1, column_index_10 + 1]
                output_1[key]['data_holiday'][df1.iloc[x + 2, column_index_10][0:5]] = df1.iloc[x + 2, column_index_10 + 1]
                output_1[key]['data_holiday'][df1.iloc[x + 3, column_index_10][0:5]] = df1.iloc[x + 3, column_index_10 + 1]
                output_1[key]['data_holiday'][df1.iloc[x + 4, column_index_10][0:5]] = df1.iloc[x + 4, column_index_10 + 1]
                output_1[key]['data_holiday'][df1.iloc[x + 5, column_index_10][0:5]] = df1.iloc[x + 5, column_index_10 + 1]

                # 假日(16-20)
                output_1[key]['data_holiday'][df1.iloc[x + 1, column_index_11][0:5]] = df1.iloc[x + 1, column_index_11 + 1]
                output_1[key]['data_holiday'][df1.iloc[x + 2, column_index_11][0:5]] = df1.iloc[x + 2, column_index_11 + 1]
                output_1[key]['data_holiday'][df1.iloc[x + 3, column_index_11][0:5]] = df1.iloc[x + 3, column_index_11 + 1]
                output_1[key]['data_holiday'][df1.iloc[x + 4, column_index_11][0:5]] = df1.iloc[x + 4, column_index_11 + 1]
                output_1[key]['data_holiday'][df1.iloc[x + 5, column_index_11][0:5]] = df1.iloc[x + 5, column_index_11 + 1]

            if has_nan(output_1):
                output_final['skipping'].append(row['tc_id'])
            else:
                output_final[row['tc_id']] = {
                    "road_name": row['road'],
                    "volume_data": output_1,
                    "road_name_direction":road_name_direction,
                }
        except Exception as e:
            print(f"處理 TC ID {row.get('tc_id', 'UNKNOWN')} 時發生錯誤: {str(e)}")
            import traceback
            traceback.print_exc()
            output_final['skipping'].append(row.get('tc_id', 'UNKNOWN'))
            continue

    result_dict = replace_nan_with_string(output_final)
    
    excel_data = json.dumps(result_dict[row['tc_id']])
    sql_str = f'''
    UPDATE public.tc_uploaded_file
    SET excel_data='{excel_data}'
    WHERE tc_id='{row['tc_id']}' and data_type='{row['data_type']}' and "date"='{row['date']}';
    '''
    db.engine.execute(text(sql_str))
        

# download需要的function
# 下載檔案
def download_file(request):
    # 取得使用者所選id
    data = request.get_json()
    data_list = data.get('data')  # 包含每筆資料的id和format

    # 取得模板並寫入資料
    export_list = search_download_path(data_list)

    if len(export_list) > 1:
        zip_path = Zip().zip_file(file_list=export_list, save_location=CFG.EXPORT_FOLDER)
    elif len(export_list) == 1:
        zip_path = export_list[0]
    else:
        return response_with(resp.INVALID_INPUT_422)

    name = zip_path.split('/')[-1]
    directory = zip_path.replace(name, '')
    folder_path = directory.split(f"{CFG.STATIC_FOLDER}/")[1]

    return {"folder_path": folder_path, "name": name}


# 取得要下載的id並輸出下載路徑的list
def search_download_path(data_list):
    # 下載function的STEP
    # 1. 取得id list
    # 2. 利用該id list到資料表中找到每筆資料已設定好的路徑(export_excel_path欄位)
    # 3. return export_list

    id_list = [item['id'] for item in data_list]

    export_list = []
    sql = """SELECT id, export_excel_path FROM tc_uploaded_file WHERE status = 'active'"""

    with db.engine.connect() as connection:
        df = pd.read_sql_query(text(sql), con=connection)
    df_all = df[df['id'].isin(id_list)]

    for item in data_list:
        # 取得索引&相關欄位資料
        index_df = df_all[df_all['id'] == item['id']]
        index_res = list(index_df.index)[0]
        export_excel_path = df_all.at[index_res, 'export_excel_path'][item['format']]  # 下載檔0,上傳檔1,其他0
        export_list.append(export_excel_path)

    return export_list


# 工具
# 判斷該日期的平假日
def get_day_type(excel_date):
    tw_holidays = holidays.TW()
    if excel_date in tw_holidays:
        day_type = '假日'  # 國定假日
    else:
        if excel_date.weekday() < 5:
            day_type = '平日'
        else:
            day_type = '假日'  # 六日
    return day_type


# 設定延滯第一頁對應日期
def get_date(r, date, test):
    period_type = [
        '平日晨峰(0630-0830)', '平日晨峰(07-09)', '平日中午(11-13)', '平日中午(12-14)', '平日昏峰(17-19)',
        '假日(11-12)', '假日(1430-1530)', '假日(1730-1830)', '假日(16-18)', '假日(17-19)', '假日(16-20)'
    ]
    # find candidate index using substring
    matched_idx = [i for i, typ in enumerate(period_type) if r['時段'] in typ or typ in r['時段']]
    result = [period_type[i] for i in range(len(period_type)) if test[i]]

    if matched_idx:
        tgt_typ = period_type[matched_idx[0]]
        if test[matched_idx[0]]:
            # 用最早的 match
            valid_sub_idx = [i for i, val in enumerate(result) if r['時段'] in val or val in r['時段']]
            if valid_sub_idx:
                return date[valid_sub_idx[0]]
    return datetime.strptime('1970-01-01', '%Y-%m-%d')

# 陣列中是否有nan(暫時不用)
def all_strings(lst):
    have_nan = []
    for x in lst:
        if x == 'nan':
            have_nan.append(True)
        else:
            have_nan.append(False)
    return any(have_nan)


def replace_nan_with_string(d):
    for key, value in d.items():
        if isinstance(value, dict):
            d[key] = replace_nan_with_string(value)
        elif isinstance(value, list):
            d[key] = [replace_nan_with_string(item) if isinstance(item, dict) else item for item in value]
        elif isinstance(value, float) and math.isnan(value):
            d[key] = "NaN"
    return d


def has_nan(d):
    for value in d.values():
        if isinstance(value, dict):
            if has_nan(value):
                return True
        elif isinstance(value, list):
            for item in value:
                if isinstance(item, dict) and has_nan(item):
                    return True
        elif isinstance(value, float) and math.isnan(value):
            return True
    return False
