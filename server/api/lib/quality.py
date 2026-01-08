# -*- coding: utf-8 -*-
import os
import pandas as pd
from api.models.quality import *
from api.utils import responses as resp
from api.utils.responses import response_with
from api.utils.sql_build import *
from api.utils.database import db
import platform
import subprocess


# 取得所選路口之基本資料與各方向資料
def get_basic_data(request):
    data = request.get_json()

    tc_list = data.get('tc_id')
    direction = data.get('direction')
    order = data.get('order')

    with db.engine.connect() as connection:
        # 基本查表(查詢並輸出volume_basic基本資料) => 每個TC選出最新一筆資料做輸出
        df_basic = pd.read_sql('volume_basic', con=connection)
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

    # 判斷是否有共同日期
    if common_dates:
        max_date = max(common_dates)
        filtered_df = df_basic[df_basic['date'] == max_date]
        res = []
        if direction == '東西向':
            for index, row in filtered_df.iterrows():
                each_data = dict()
                each_road = row['t_road'].split(', ')
                each_dir = row['t_direction'].split(', ')
                each_drive_dir = row['t_drive_direction'].split(', ')
                each_data[row['tc_id']] = {
                    "road_name": row['road'],
                    "each_road": [each_road[-1]] + each_road[:-1],
                    "each_dir": [each_dir[-1]] + each_dir[:-1],
                    "each_drive_dir": [each_drive_dir[-1]] + each_drive_dir[:-1]
                }
                res.append(each_data)
        elif direction == '南北向':
            for index, row in filtered_df.iterrows():
                each_data = dict()
                each_data[row['tc_id']] = {
                    "road_name": row['road'],
                    "each_road": row['t_road'].split(', '),
                    "each_dir": row['t_direction'].split(', '),
                    "each_drive_dir": row['t_drive_direction'].split(', ')
                }
                res.append(each_data)

        sorted_data = sorted(res, key=lambda x: order.index(list(x.keys())[0]))  # 確認有依照前端給的順序作排序
        res_all = {"data": sorted_data, "all_date": common_dates}

        return response_with(resp.SUCCESS_200, value={"data": res_all})
    else:
        return {"http_code": 422, "code": "fileContentError", "message": '選取的TC無共同調查日期，請重新選取'}


# 取得各路口所有轉向流量
def get_all_result(request):
    data = request.get_json()

    tc_list = data.get('tc_id')
    calc_date = data.get('calc_date')  # 日期
    calc_period = data.get('calc_period')  # 時段
    calc_type = data.get('calc_type')  # 檢核型態(決定要讀哪張表)
    order = data.get('order')

    with db.engine.connect() as connection:
        # 基本查表(查詢並輸出tc_uploaded_file資料 => 讀表)
        df_upload = pd.read_sql('tc_uploaded_file', con=connection)
        df_upload = df_upload[df_upload['tc_id'].isin(tc_list)]
        filtered_df = df_upload[df_upload['date'] == calc_date]

    res = []
    for index, row in filtered_df.iterrows():
        each_data = dict()

        # 視情況產生新的excel檔(測試區 => 產生新檔案/本機開發 => 套用原檔案)
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
                    continue

            if os.path.exists(excel_file_convert):
                excel_path = excel_file_convert
        else:
            print('本機測試')
            excel_path = row['export_excel_path'][0]  # 取得第一個檔案(下載檔版本)

        res_calc = read_excel_function(excel_path, calc_type, calc_period)  # 讀取excel

        each_data[row['tc_id']] = {
            "road_name": row['road'],
            "A": res_calc['A'],
            "B": res_calc['B'],
            "C": res_calc['C'],
            "D": res_calc['D']
        }
        res.append(each_data)

    sorted_data = sorted(res, key=lambda x: order.index(list(x.keys())[0]))  # 確認有依照前端給的順序作排序

    return response_with(resp.SUCCESS_200, value={"data": sorted_data})


def read_excel_function(excel_file, calc_type, calc_period):
    # 判斷讀取哪一張工作表
    # 0 => 車流量 => 讀取調查資料(OUT)
    # 1 => PCU => 讀取PHF及轉向比

    if calc_type == 0:
        df = pd.read_excel(excel_file, '調查資料(OUT)', header=None)
        df.columns = df.iloc[7].tolist()
        df_cut = df.iloc[8:]
        df_cut.reset_index(drop=True, inplace=True)

        # 1. 找出檢核區間的index
        calc_period_change = calc_period
        first_column = df_cut.iloc[:, 0]
        start_idx = first_column[first_column == calc_period_change[0]].index[0]
        end_idx = first_column[first_column == calc_period_change[1]].index[0] - 1

        # 2. 找到ABCD各區塊(各方向 ←A ↑B →C ↓D) => 以四叉為例
        df_section = {
            "A": df_cut.loc[:, '←A':'↑B'].iloc[:, :-1],
            "B": df_cut.loc[:, '↑B':'→C'].iloc[:, :-1],
            "C": df_cut.loc[:, '→C':'↓D'].iloc[:, :-1],
            "D": df_cut.loc[:, '↓D':],
        }

        # 各路口類型整理
        # 四叉
        # 左轉: [0, 3, 6, 7]
        # 直轉: [1, 4, 8]
        # 右轉: [2, 5, 9]

        # 找第index = 1 的資料中涵蓋的左直右對應欄位 => 每個方向計算(大車+小車+機車+(機車兩段))
        # 各方向左轉
        left_turn = {"a_left": 0, "b_left": 0, "c_left": 0, "d_left": 0}
        for item in [0, 3, 6, 7]:
            left_turn['a_left'] = left_turn['a_left'] + df_section['A'].iloc[:, item].loc[start_idx:end_idx].sum()
            left_turn['b_left'] = left_turn['b_left'] + df_section['B'].iloc[:, item].loc[start_idx:end_idx].sum()
            left_turn['c_left'] = left_turn['c_left'] + df_section['C'].iloc[:, item].loc[start_idx:end_idx].sum()
            left_turn['d_left'] = left_turn['d_left'] + df_section['D'].iloc[:, item].loc[start_idx:end_idx].sum()

        front_turn = {"a_front": 0, "b_front": 0, "c_front": 0, "d_front": 0}
        for item in [1, 4, 8]:
            front_turn['a_front'] = front_turn['a_front'] + df_section['A'].iloc[:, item].loc[start_idx:end_idx].sum()
            front_turn['b_front'] = front_turn['b_front'] + df_section['B'].iloc[:, item].loc[start_idx:end_idx].sum()
            front_turn['c_front'] = front_turn['c_front'] + df_section['C'].iloc[:, item].loc[start_idx:end_idx].sum()
            front_turn['d_front'] = front_turn['d_front'] + df_section['D'].iloc[:, item].loc[start_idx:end_idx].sum()

        right_turn = {"a_right": 0, "b_right": 0, "c_right": 0, "d_right": 0}
        for item in [2, 5, 9]:
            right_turn['a_right'] = right_turn['a_right'] + df_section['A'].iloc[:, item].loc[start_idx:end_idx].sum()
            right_turn['b_right'] = right_turn['b_right'] + df_section['B'].iloc[:, item].loc[start_idx:end_idx].sum()
            right_turn['c_right'] = right_turn['c_right'] + df_section['C'].iloc[:, item].loc[start_idx:end_idx].sum()
            right_turn['d_right'] = right_turn['d_right'] + df_section['D'].iloc[:, item].loc[start_idx:end_idx].sum()

        excel_res = {
            "A": {
                "org_road_name": f"{df_section['A'].columns.tolist()[1]}往西",
                "left": left_turn['a_left'],  # B
                "front": front_turn['a_front'],  # C
                "right": right_turn['a_right'],  # D
                "total": left_turn['a_left'] + front_turn['a_front'] + right_turn['a_right']
            },
            "B": {
                "org_road_name": f"{df_section['B'].columns.tolist()[1]}往北",
                "left": left_turn['b_left'],  # C
                "front": front_turn['b_front'],  # D
                "right": right_turn['b_right'],  # A
                "total": left_turn['b_left'] + front_turn['b_front'] + right_turn['b_right']
            },
            "C": {
                "org_road_name": f"{df_section['C'].columns.tolist()[1]}往東",
                "left": left_turn['c_left'],  # D
                "front": front_turn['c_front'],  # A
                "right": right_turn['c_right'],  # B
                "total": left_turn['c_left'] + front_turn['c_front'] + right_turn['c_right']
            },
            "D": {
                "org_road_name": f"{df_section['D'].columns.tolist()[1]}往南",
                "left": left_turn['d_left'],  # A
                "front": front_turn['d_front'],  # B
                "right": right_turn['d_right'],  # C
                "total": left_turn['d_left'] + front_turn['d_front'] + right_turn['d_right']
            }
        }

    if calc_type == 1:
        df = pd.read_excel(excel_file, 'PHF及轉向比', header=None)
        df.columns = df.iloc[1].tolist()
        df_cut = df.iloc[2:]
        df_cut.reset_index(drop=True, inplace=True)

        # 1. 找出檢核區間的index
        calc_period_change = [1630, 1645]  # 之後調整
        first_column = df_cut.iloc[:, 0]
        start_idx = first_column[first_column == calc_period_change[0]].index[0]
        end_idx = first_column[first_column == calc_period_change[1]].index[0]

        # 2. 找到ABCD各區塊(各方向 ←A ↑B →C ↓D) => 以四叉為例
        df_section = {
            "A": df_cut.loc[:, '←A':'↑B'].iloc[:, :-1],
            "B": df_cut.loc[:, '↑B':'→C'].iloc[:, :-1],
            "C": df_cut.loc[:, '→C':'↓D'].iloc[:, :-1],
            "D": df_cut.loc[:, '↓D': '路口'].iloc[:, :-1],
        }

        # 各路口類型整理
        # 四叉
        # 左轉: [1]
        # 直轉: [2]
        # 右轉: [3]

        # 各方向左轉
        left_turn = {"a_left": 0, "b_left": 0, "c_left": 0, "d_left": 0}
        for item in [1]:
            left_turn['a_left'] = left_turn['a_left'] + df_section['A'].iloc[:, item].loc[start_idx:end_idx].sum()
            left_turn['b_left'] = left_turn['b_left'] + df_section['B'].iloc[:, item].loc[start_idx:end_idx].sum()
            left_turn['c_left'] = left_turn['c_left'] + df_section['C'].iloc[:, item].loc[start_idx:end_idx].sum()
            left_turn['d_left'] = left_turn['d_left'] + df_section['D'].iloc[:, item].loc[start_idx:end_idx].sum()

        front_turn = {"a_front": 0, "b_front": 0, "c_front": 0, "d_front": 0}
        for item in [2]:
            front_turn['a_front'] = front_turn['a_front'] + df_section['A'].iloc[:, item].loc[start_idx:end_idx].sum()
            front_turn['b_front'] = front_turn['b_front'] + df_section['B'].iloc[:, item].loc[start_idx:end_idx].sum()
            front_turn['c_front'] = front_turn['c_front'] + df_section['C'].iloc[:, item].loc[start_idx:end_idx].sum()
            front_turn['d_front'] = front_turn['d_front'] + df_section['D'].iloc[:, item].loc[start_idx:end_idx].sum()

        right_turn = {"a_right": 0, "b_right": 0, "c_right": 0, "d_right": 0}
        for item in [3]:
            right_turn['a_right'] = right_turn['a_right'] + df_section['A'].iloc[:, item].loc[start_idx:end_idx].sum()
            right_turn['b_right'] = right_turn['b_right'] + df_section['B'].iloc[:, item].loc[start_idx:end_idx].sum()
            right_turn['c_right'] = right_turn['c_right'] + df_section['C'].iloc[:, item].loc[start_idx:end_idx].sum()
            right_turn['d_right'] = right_turn['d_right'] + df_section['D'].iloc[:, item].loc[start_idx:end_idx].sum()

        excel_res = {
            "A": {
                "left": round(left_turn['a_left']),     # B
                "front": round(front_turn['a_front']),  # C
                "right": round(right_turn['a_right']),  # D
                "total": round(left_turn['a_left']) + round(front_turn['a_front']) + round(right_turn['a_right'])
            },
            "B": {
                "left": round(left_turn['b_left']),     # C
                "front": round(front_turn['b_front']),  # D
                "right": round(right_turn['b_right']),  # A
                "total": round(left_turn['b_left']) + round(front_turn['b_front']) + round(right_turn['b_right'])
            },
            "C": {
                "left": round(left_turn['c_left']),     # D
                "front": round(front_turn['c_front']),  # A
                "right": round(right_turn['c_right']),  # B
                "total": round(left_turn['c_left']) + round(front_turn['c_front']) + round(right_turn['c_right'])
            },
            "D": {
                "left": round(left_turn['d_left']),     # A
                "front": round(front_turn['d_front']),  # B
                "right": round(right_turn['d_right']),  # C
                "total": round(left_turn['d_left']) + round(front_turn['d_front']) + round(right_turn['d_right'])
            }
        }

    return excel_res


# 選擇最新日期的資料
def select_latest_date(group):
    latest_date = group['date'].max()
    latest_data = group[group['date'] == latest_date].iloc[0]
    return latest_data

