import os
import math
import json
import pandas as pd
import itertools
from sqlalchemy import text
from ..models.road_turning_static import Road_turning_static
from ..utils.database import db
from ..utils import responses as resp
from ..utils.responses import response_with
from ..utils.sql_build import sql_insert_if_not_exist, sql_insert, sql_update


# 更新路口定義(轉向)&參數設定&路段繪製資料
def create_turning_static(request):
    data = request.get_json()
    update_keys = ['svg_detail', 'road_param', 'road_section']
    update_dict = {key: data[key] for key in update_keys if key in data}
    sql_str, combined_dict = sql_insert_if_not_exist('road_turning_static', data, ['tc_id'], update_dict)
    db.engine.execute(text(sql_str), **combined_dict)

    return response_with(resp.SUCCESS_200, value={'msg': "ok"})


# 取得路口定義(轉向)&參數設定&路段繪製資料
def get_turning_data(type, tc_id):
    type_list = ['svg_detail', 'road_param', 'road_section']
    if type not in type_list:
        return response_with(resp.INVALID_FIELD_NAME_SENT_422)
    
    delay_vb_df_sql = f"SELECT * FROM public.delay_basic where tc_id = '{tc_id}'"
    volume_vb_df_sql = f"SELECT * FROM public.volume_basic where tc_id = '{tc_id}'"
    
    with db.engine.connect() as connection:
        # 取得路口基本資料
        tc_df = pd.read_sql('tc_road_info', con=connection)

        # 取得轉向量資料
        turning_df = pd.read_sql('road_turning_static', con=connection)

        # 讀delay
        delay_vb_df = pd.read_sql(delay_vb_df_sql, con=db.engine)

        # 讀volume
        volume_vb_df = pd.read_sql(volume_vb_df_sql, con=db.engine)

    tc_df = tc_df[tc_df['tc_id'] == tc_id]
    tc = tc_df.iloc[-1]
    turning_df.set_index('tc_id', inplace=True)

    # 取得匯入資料
    # 建一個空df
    vb_df = pd.DataFrame()

    if not delay_vb_df.empty:
        vb_df = delay_vb_df
    elif not volume_vb_df.empty:
        vb_df = volume_vb_df

    # 未取得該編號資料
    if vb_df.empty:
        return response_with(resp.INVALID_INPUT_422)
    else:
        # 取得最新一筆
        vb_df['date'] = pd.to_datetime(vb_df['date'])
        sorted_df = vb_df.sort_values('date')
        vb = sorted_df.iloc[-1]

        # 定義所有路口類型
        all_inter_type = {
            'three': ['三叉路口'],
            'four': ['正交四叉路口', '四叉路口'],
            'five': ['五叉路口'],
            'six': ['六叉路口']
        }

        # 處理延滯路口名稱，使其可套用於上面的路口類型
        inter_record = vb['intersection_type']

        # 將字串分割成陣列
        dirs = [d.strip() for d in vb['t_direction'].split(', ')]
        roads = [r.strip() for r in vb['t_road'].split(', ')]

        # 構建輸出陣列
        turning_list = []
        param_list = []
        section_list = []
        for i, item in enumerate(dirs):
            each_dir = list(filter(lambda x: x != item, rotate_list(dirs, item)))
            unit_angle = 360 / len(dirs)
            angle = unit_angle * (i - 1)
            # 路口定義
            type_arr = list(itertools.chain(all_inter_type['three'], all_inter_type['four']))
            if inter_record in type_arr:
                # 三叉/四叉(目前是定義都給四組箭頭)
                turning_list.append({
                    'each_road': roads[i],
                    'marker_dir': item,
                    'origin_position': calculate_position([tc['lat'], tc['lng']], 0.00032, -angle - 90),
                    'arrow_setting': [
                        {
                            'id': '',
                            'position': [],
                            'angle': angle,
                            'direction_name': each_dir[0],
                            'type': '左轉',
                            'select_arrow_type': '左轉'
                        },
                        {
                            'id': '',
                            'position': [],
                            'angle': angle,
                            'direction_name': each_dir[1],
                            'type': '直行',
                            'select_arrow_type': '直行'
                        },
                        {
                            'id': '',
                            'position': [],
                            'angle': angle,
                            'direction_name': each_dir[2],
                            'type': '右轉',
                            'select_arrow_type': '右轉'
                        }
                    ]
                })
            elif inter_record in all_inter_type['five']:
                # 五叉
                turning_list.append({
                    'each_road': roads[i],
                    'marker_dir': item,
                    'origin_position': calculate_position([tc['lat'], tc['lng']], 0.00032, -angle - 90),
                    'arrow_setting': [
                        {
                            'id': '',
                            'position': [],
                            'angle': angle,
                            'direction_name': each_dir[0],
                            'type': '左轉',
                            'select_arrow_type': '左轉'
                        },
                        {
                            'id': '',
                            'position': [],
                            'angle': angle,
                            'direction_name': each_dir[1],
                            'type': '直行',
                            'select_arrow_type': '直行',
                            'front_order': 1
                        },
                        {
                            'id': '',
                            'position': [],
                            'angle': angle,
                            'direction_name': each_dir[2],
                            'type': '直行',
                            'select_arrow_type': '直行',
                            'front_order': 2
                        },
                        {
                            'id': '',
                            'position': [],
                            'angle': angle,
                            'direction_name': each_dir[3],
                            'type': '右轉',
                            'select_arrow_type': '右轉'
                        }
                    ]
                })
            elif inter_record in all_inter_type['six']:
                # 六叉
                turning_list.append({
                    'each_road': roads[i],
                    'marker_dir': item,
                    'origin_position': calculate_position([tc['lat'], tc['lng']], 0.00032, -angle - 90),
                    'arrow_setting': [
                        {
                            'id': '',
                            'position': [],
                            'angle': angle,
                            'direction_name': each_dir[0],
                            'type': '左轉',
                            'select_arrow_type': '左轉'
                        },
                        {
                            'id': '',
                            'position': [],
                            'angle': angle,
                            'direction_name': each_dir[1],
                            'type': '直行',
                            'select_arrow_type': '直行',
                            'front_order': 1
                        },
                        {
                            'id': '',
                            'position': [],
                            'angle': angle,
                            'direction_name': each_dir[2],
                            'type': '直行',
                            'select_arrow_type': '直行',
                            'front_order': 2
                        },
                        {
                            'id': '',
                            'position': [],
                            'angle': angle,
                            'direction_name': each_dir[3],
                            'type': '直行',
                            'select_arrow_type': '直行',
                            'front_order': 3
                        },
                        {
                            'id': '',
                            'position': [],
                            'angle': angle,
                            'direction_name': each_dir[4],
                            'type': '右轉',
                            'select_arrow_type': '右轉'
                        }
                    ]
                })
            # 參數設定
            param_list.append({
                'direction': item,
                'road_name': roads[i],
                "road_type": '',
                "is_separate": '',
                "lane_num": 1,
                "capacity": -99
            })
            # 路段繪製
            section_list.append({
                'direction': item,
                'road_name': roads[i],
                'location': None
            })

        # 取得所有道路分類列表
        search_df = pd.read_sql('road_volume_static', con=db.engine)
        all_road_type = search_df['road_type'].unique().tolist()

    try:
        target = json.loads(turning_df.loc[tc_id][type] or "{}")
    except KeyError as e:
        target = {}

    if type == 'svg_detail':
        data = {
            'road_groups': [],
            'turning_config': list(filter(lambda x: x['each_road'] != '-', turning_list))
        }
    elif type == 'road_param':
        data = {
            'setting': list(filter(lambda x: x['road_name'] != '-', param_list)),
            'all_road_type': all_road_type
        }
    elif type == 'road_section':
        data = {
            'lines': list(filter(lambda x: x['road_name'] != '-', section_list))
        }
    else:
        data = {}

    res = {
        'road': tc['road'],
        'city': tc['city'],
        'intersection_type': vb['intersection_type']
    }

    res.update(data)
    res.update(target)

    return response_with(resp.SUCCESS_200, value={'data': res})


# 取得資料分析檢視頁面資料
def get_statistics_data(request):
    param = request.get_json()
    tc_id = param['tc_id']
    data_type = param['type']
    owner_name = param['owner_name']
    project_num = param['project_num']
    date_range = param['date_range']  # 時間範圍(空值或單一日期)
    is_holiday = param['weekday']  # 時段選擇(平日/假日)

    with db.engine.connect() as connection:

        # 流量類型
        if data_type == 'volume':
            # 路口編號
            if len(tc_id) == 1:
                sql_tuple_tc = f"('{tc_id[0]}')"
            else:
                sql_tuple_tc = tuple(tc_id)

            # 業主名稱
            if len(owner_name) == 0:
                df = pd.read_sql('owner_project', con=connection)
                if len(df.axes[0]) == 1:
                    sql_tuple_owner = f"('{df['owner_name'].to_list()[0]}')"
                else:
                    sql_tuple_owner = tuple(df['owner_name'].drop_duplicates().to_list())
            elif len(owner_name) == 1:
                sql_tuple_owner = f"('{owner_name[0]}')"
            else:
                sql_tuple_owner = tuple(owner_name)

            # 專案編號
            if len(project_num) == 0:
                df = pd.read_sql('owner_project', con=connection)
                if len(df.axes[0]) == 1:
                    sql_tuple_project = f"('{df['project_num'].to_list()[0]}')"
                else:
                    sql_tuple_project = tuple(df['project_num'].to_list())
            elif len(project_num) == 1:
                sql_tuple_project = f"('{project_num[0]}')"
            else:
                sql_tuple_project = tuple(project_num)

            # 若回傳之日期為空值(沒有共同日期或使用者沒選)=>各TC選擇所選平假日種類資料中最新一筆/有日期:使用該日期做查詢
            if date_range == '':
                # print('空值: 沒有共同日期或使用者沒選')
                sql = f'''with
                    cte1 as
                    (
                        select tc_id, max("date") as latest_date
                        FROM public.volume_basic
                        where tc_id in {sql_tuple_tc}
                        and owner_name in {sql_tuple_owner}
                        and project_num in {sql_tuple_project}
                        and holiday_type LIKE :holiday_param
                        group by tc_id
                    ),
                    cte2 as
                    (
                        select tc_id, road_param, road_section, svg_detail
                        FROM public.road_turning_static
                        where tc_id in {sql_tuple_tc}
                    )
                    select a.tc_id, a.road, a.export_excel_path, a.intersection_type, a.excel_data , c.road_param, c.road_section, c.svg_detail
                    from public.tc_uploaded_file a
                    join cte1 b
                        on a.tc_id = b.tc_id and a.date = b.latest_date
                    join cte2 c
                        on a.tc_id = c.tc_id
                    where data_type = '{data_type}';'''
                df = pd.read_sql(text(sql), con=connection, params={'holiday_param': f'%{is_holiday}%'})
            else:
                # print(f"取所有TC之{date_range}做查詢")
                sql = f'''with
                    cte1 as
                    (
                        select tc_id, date
                        FROM public.volume_basic
                        where tc_id in {sql_tuple_tc}
                        and owner_name in {sql_tuple_owner}
                        and project_num in {sql_tuple_project}
                        and holiday_type LIKE :holiday_param
                    ),
                    cte2 as
                    (
                        select tc_id, road_param, road_section, svg_detail
                        FROM public.road_turning_static
                        where tc_id in {sql_tuple_tc}
                    )
                    select a.tc_id, a.road, a.export_excel_path, a.intersection_type, a.excel_data , c.road_param, c.road_section, c.svg_detail, b.date
                    from public.tc_uploaded_file a
                    join cte1 b
                    on a.tc_id = b.tc_id and a.date = b.date
                    join cte2 c
                    on a.tc_id = c.tc_id
                    where data_type = '{data_type}';'''
                res = pd.read_sql(text(sql), con=connection, params={'holiday_param': f'%{is_holiday}%'})
                # 過濾出所選日期
                res['date'] = res['date'].astype(str)
                df = res.loc[res['date'] == date_range]

            set1 = set(tc_id)
            set2 = set(df['tc_id'].tolist())
            difference = set1 - set2
            check_sql_result = list(difference)

            # 沒找到對應資料
            if check_sql_result:
                res_msg = is_holiday + "的" + ",".join(check_sql_result) + "不存在於資料庫中，請解除勾選!"
                return response_with(resp.SUCCESS_200, value={'data': {}, 'message': res_msg})

            # 有找到對應資料
            try:
                res = read_excel_function_volume_v2(df)  # 讀取excel
                return response_with(resp.SUCCESS_200, value={'data': res, 'message': "資料取得正常"})
            except Exception as e:
                print(e)
                return response_with(resp.SUCCESS_200, value={'data': {}, 'message': "資料取得異常"})

        elif data_type == 'delay':
            # 路口編號
            if len(tc_id) == 1:
                sql_tuple_tc = f"('{tc_id[0]}')"
            else:
                sql_tuple_tc = tuple(tc_id)

            # 業主名稱
            if len(owner_name) == 0:
                df = pd.read_sql('owner_project', con=connection)
                if len(df.axes[0]) == 1:
                    sql_tuple_owner = f"('{df['owner_name'].to_list()[0]}')"
                else:
                    sql_tuple_owner = tuple(df['owner_name'].drop_duplicates().to_list())
            elif len(owner_name) == 1:
                sql_tuple_owner = f"('{owner_name[0]}')"
            else:
                sql_tuple_owner = tuple(owner_name)

            # 專案編號
            if len(project_num) == 0:
                df = pd.read_sql('owner_project', con=connection)
                if len(df.axes[0]) == 1:
                    sql_tuple_project = f"('{df['project_num'].to_list()[0]}')"
                else:
                    sql_tuple_project = tuple(df['project_num'].to_list())
            elif len(project_num) == 1:
                sql_tuple_project = f"('{project_num[0]}')"
            else:
                sql_tuple_project = tuple(project_num)

            # 若回傳之日期為空值(沒有共同日期或使用者沒選)=>各TC選擇所選平假日種類資料中最新一筆/有日期:使用該日期做查詢
            if date_range == '':
                # print('空值: 沒有共同日期或使用者沒選')
                sql = f'''with
                        cte1 as
                        (
                            select tc_id, max("date") as latest_date
                            FROM public.delay_basic
                            where tc_id in {sql_tuple_tc}
                            and owner_name in {sql_tuple_owner}
                            and project_num in {sql_tuple_project}
                            and day_peak LIKE :holiday_param
                            group by tc_id
                        ),
                        cte2 as
                        (
                            select tc_id, road_section
                            FROM public.road_turning_static
                            where tc_id in {sql_tuple_tc}
                        )
                        select a.tc_id, a.road, a.export_excel_path, a.intersection_type, c.road_section
                        from public.tc_uploaded_file a
                        join cte1 b
                        on a.tc_id = b.tc_id and a.date = b.latest_date
                        join cte2 c
                        on a.tc_id = c.tc_id
                        where data_type = '{data_type}';'''

                df = pd.read_sql(text(sql), con=connection, params={'holiday_param': f'%{is_holiday}%'})
            else:
                # print(f"取所有TC之{date_range}做查詢")
                sql = f'''with
                        cte1 as
                        (
                            select tc_id, date
                            FROM public.delay_basic
                            where tc_id in {sql_tuple_tc}
                            and owner_name in {sql_tuple_owner}
                            and project_num in {sql_tuple_project}
                            and day_peak LIKE :holiday_param
                        ),
                        cte2 as
                        (
                            select tc_id, road_section
                            FROM public.road_turning_static
                            where tc_id in {sql_tuple_tc}
                        )
                        select a.tc_id, a.road, a.export_excel_path, a.intersection_type, c.road_section, b.date
                        from public.tc_uploaded_file a
                        join cte1 b
                        on a.tc_id = b.tc_id and a.date = b.date
                        join cte2 c
                        on a.tc_id = c.tc_id
                        where data_type = '{data_type}';'''
                res = pd.read_sql(text(sql), con=connection, params={'holiday_param': f'%{is_holiday}%'})
                # 過濾出所選日期
                res['date'] = res['date'].astype(str)
                df = res.loc[res['date'] == date_range][:1]  # 先暫時只取第一筆資料，反正每筆都長一樣(之後優化)

            try:
                res = read_excel_function_delay_v2(df)
                return response_with(resp.SUCCESS_200, value={'data': res, 'message': "資料取得正常"})
            except Exception as e:
                print(e)
                return response_with(resp.SUCCESS_200, value={'data': {}, 'message': "資料取得異常"})
        else:
            return response_with(resp.SUCCESS_200, value={'data': {}, 'message': "參數錯誤"})


# 取得所有TC狀態資料
def get_all_tc_turning_status():
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

    with db.engine.connect() as connection:
        result_df = pd.read_sql(text(sql), con=connection)

    return response_with(resp.SUCCESS_200, value={"data": result_df.to_dict('records')})


# 取得建議容量(參數設定頁面)
def get_ref_volume(request):
    param = request.get_json()
    direction = param['direction']
    road_type = param['road_type']
    is_separate = param['is_separate']
    lane_num = param['lane_num']

    with db.engine.connect() as connection:
        # 依條件查詢建議容量
        search_df = pd.read_sql('road_volume_static', con=connection)
    search_df = search_df[(search_df['road_type'] == road_type) & (search_df['is_separate'] == is_separate) & (search_df['lane_num'] == lane_num)]
    if search_df.empty:
        ref_volume = -999
    else:
        ref_volume = int(search_df['ref_volume'].iloc[0])
    return response_with(resp.SUCCESS_200, value={"data": {'direction': direction, 'ref_volume': ref_volume}})


def calculate_position(center, radius, angle_degrees):
    [lat, lng] = center
    # 將角度從度數轉換為弧度
    angle_radians = math.radians(angle_degrees)

    # 計算 x 和 y 坐標
    x = lng + radius * math.cos(angle_radians)
    y = lat + radius * math.sin(angle_radians)

    return [y, x]


def rotate_list(arr, foo):
    if foo in arr:
        index = arr.index(foo)
        shift = arr[1:] + arr[:1]
        rotated_arr = shift[index:] + shift[:index]
        return rotated_arr
    else:
        return arr


# 讀取excel(流量)
def read_excel_function_volume_v2(input_df):
    file_df = pd.DataFrame(input_df)

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

    # 初始化output_1
    output_1 = {}
    output_1_list = [0] * len(time_list)
    
    for index, row in file_df.iterrows():
        excel_data = json.loads(row['excel_data'])
        road_name_direction = excel_data['road_name_direction']
        df3 = pd.DataFrame(excel_data['df3'])
        output_1_list_temp = excel_data['output_1_list_temp']
        
        output_3 = {}
        road_section = json.loads(row['road_section'])
        road_param = json.loads(row['road_param'])
        svg_detail = json.loads(row['svg_detail'])
        
        
        for key, value in road_name_direction.items():
            # 如果路名有-(代表該檔案是三叉，並且該方向沒有資料) => 強制跳出迴圈
            if '-' in value:
                continue
            
            # 抓取預估容量
            filtered_data = [item for item in road_param['setting'] if item['direction'] == key][0]
            
            output_3[key] = {}
            output_3[key]['data'] = {}
            
            # 抓取線段座標
            output_3[key]['location'] = [item for item in road_section['lines'] if item['direction'] == key][0]['location']

            column_index = df3.iloc[[1]].columns[df3.iloc[[1]].eq(value).any(axis=0)][0]
            
            # =================================================
            data = df3.iloc[4:100, int(column_index)].to_list()  # 先讀全部(96筆資料)
            window_size = 4
            result = []
            for i in range(len(data) - window_size + 1):
                window = data[i:i + window_size]
                window_sum = sum(window)
                result.append(window_sum)
            # =================================================

            for index, item in enumerate(time_list):
                # 因為移動窗格的關係只剩下93個值
                if index < 93:
                    output_3[key]['data'][item] = result[index] / filtered_data['capacity']
            
        column_index = df3.iloc[[2]].columns[df3.iloc[[2]].eq('總計').any(axis=0)][0]
        output_3['total'] = {}
        for index, item in enumerate(time_list):
            output_3["total"][item] = df3.iloc[(index + 4), int(column_index)]


        output_1_list = [sum(i) for i in zip(output_1_list, output_1_list_temp)]
        output_final[row['tc_id']] = {
            "road_name": excel_data['road_name'],
            "turning_data": excel_data['turning_data'],
            "volume_data": output_3,
            "turning_config_data": excel_data['turning_config_data']
        }
        
        output_final[row['tc_id']]['turning_config_data']['road_groups'] = svg_detail['road_groups']
        output_final[row['tc_id']]['turning_config_data']['turning_config'] = svg_detail['turning_config']
        

    for index, item in enumerate(time_list):
        # 測試用(time_list 96項，output_1/output_1_list 93項)
        if index < 93:  # 採用以上ranking就只會到23:00
            output_1[item] = output_1_list[index]    
        

    output_final['ranking'] = output_1
    result_dict = replace_nan_with_string(output_final)

    return result_dict


# 讀取excel(延滯)
def read_excel_function_delay_v2(input_df):
    file_df = pd.DataFrame(input_df)

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

    
    for index, row in file_df.iterrows():
        excel_data = json.loads(row['excel_data'])
        road_name_direction = excel_data['road_name_direction']
        
        road_section = json.loads(row['road_section'])
        
        output_final[row['tc_id']] = {
            "road_name": excel_data['road_name'],
            "volume_data": excel_data['volume_data'],
        }
        
        for key, value in road_name_direction.items():
            # 抓取線段座標
            output_final[row['tc_id']]['volume_data'][key]['location'] = [item for item in road_section['lines'] if item['direction'] == key][0]['location']
            
    result_dict = replace_nan_with_string(output_final)

    return result_dict


# 取得編輯狀態(路口定義/參數設定/路段繪製)
def get_turning_status(request):
    param = request.get_json()
    tc_id = param['tc_id']

    df = pd.read_sql('road_turning_static', con=db.engine)
    df_filter = df[df['tc_id'] == tc_id].reset_index()

    if df_filter.empty:
        res = {"p1": False, "p2": False, "p3": False}
    else:
        res1 = df_filter['svg_detail'][0] != None and df_filter['svg_detail'][0] != ''
        res2 = df_filter['road_param'][0] != None and df_filter['road_param'][0] != ''
        res3 = df_filter['road_section'][0] != None and df_filter['road_section'][0] != ''
        res = {"p1": res1, "p2": res2, "p3": res3}

    return response_with(resp.SUCCESS_200, value={'data': res})


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