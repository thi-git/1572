from ..utils.database import db
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from sqlalchemy import Column, String, Text, Integer, Date, PrimaryKeyConstraint, Time


# 所有檔案上傳紀錄
class TC_uploaded_file(db.Model):
    __tablename__ = 'tc_uploaded_file'
    id = Column(String(40), primary_key=True, comment='ID')
    tc_id = db.Column(db.String(50), comment='路口ID')
    road = db.Column(db.String(100), comment='路口')
    data_type = db.Column(db.String(20), comment='資料類別')
    owner_name = db.Column(db.String(20), comment='業主名稱')
    project_num = db.Column(db.String(20), comment='專案編號')
    holiday_type = db.Column(db.String(20), comment='平假日類型')
    date = db.Column(Date, comment='日期')
    intersection_type = db.Column(db.String(50), comment='路口類型')
    turning_detail = db.Column(Text, comment='第一個分頁資料')
    basic_detail = db.Column(Text, comment='第二個分頁資料')
    pce_data = db.Column(Text, comment='套用PCE資料')
    excel_data = db.Column(Text, comment='預處理資料')
    commit = db.Column(db.String(100), comment='上傳備註')
    update_time = db.Column(db.DateTime, comment='資料更新時間')
    export_excel_path = db.Column(db.ARRAY(db.String(100)), comment='下載檔案路徑')
    date_group = db.Column(db.String(100), comment='所有日期紀錄')
    status = db.Column(db.String(20), default='active', comment='狀態')

    def create(self):
        db.session.add(self)
        db.session.commit()
        return self


# 存取流量分頁一內容
class Volume_turning(db.Model):
    __tablename__ = 'volume_turning'
    start_road = db.Column(db.String(20), primary_key=True, comment='臨近路段')  # 主鍵
    start_time = db.Column(Time, primary_key=True, comment='起始時間')  # 主鍵
    end_time = db.Column(Time, comment='結束時間')
    direction = db.Column(db.String(20), primary_key=True, comment='方向')  # 主鍵
    lg_car = db.Column(Integer, comment='大車')
    sm_car = db.Column(Integer, comment='小車')
    moto_two = db.Column(Integer, comment='機車兩段')
    moto = db.Column(Integer, comment='機車')
    tc_id = db.Column(db.String(50), primary_key=True, comment='路口ID')  # 主鍵
    date = db.Column(Date, primary_key=True, comment='日期')  # 主鍵

    # 創建組合唯一索引
    __table_args__ = (
        PrimaryKeyConstraint('start_road', 'start_time', 'direction', 'tc_id', 'date', name='uix_start_road_start_time_direction_tc_id_date'),
    )


# 存取流量分頁二內容
class Volume_basic(db.Model):
    __tablename__ = 'volume_basic'
    road = db.Column(db.String(50), comment='站名')
    tc_id = db.Column(db.String(50), primary_key=True, comment='路口編碼')  # 主鍵
    area = db.Column(db.String(20), comment='行政區域')
    date = db.Column(Date, primary_key=True, comment='日期')  # 主鍵
    holiday_type = db.Column(db.String(20), comment='平假日')
    investigate_time = db.Column(db.String(20), comment='調查時段')
    weather = db.Column(db.String(20), comment='天候')
    intersection_type = db.Column(db.String(20), comment='路口類型')
    t_direction = db.Column(db.String(20), comment='表格方向')
    t_road = db.Column(db.String(100), comment='表格路段名')
    t_lane_num = db.Column(db.String(100), comment='表格車道數')
    t_drive_direction = db.Column(db.String(100), comment='表格行車方向')
    t_for_five_up = db.Column(Text, comment='多叉路口表格向下延伸內容')
    owner_name = db.Column(db.String(20), comment='業主名稱')
    project_num = db.Column(db.String(20), comment='專案編號')

    # 創建組合唯一索引
    __table_args__ = (
        PrimaryKeyConstraint('tc_id', 'date', name='uix_tc_id_date'),
    )


# 存取延滯分頁一內容
class Delay_save(db.Model):
    __tablename__ = 'delay_save'
    time_period = db.Column(db.String(20), primary_key=True, comment='時段')  # 主鍵
    start_road = db.Column(db.String(20), primary_key=True, comment='臨近路段')  # 主鍵
    start_time = db.Column(Time, primary_key=True, comment='開始時刻')  # 主鍵
    car_num_0 = db.Column(Integer, comment='停車在臨進車道上的車輛總數(0秒)')
    car_num_15 = db.Column(Integer, comment='停車在臨進車道上的車輛總數(15秒)')
    car_num_30 = db.Column(Integer, comment='停車在臨進車道上的車輛總數(30秒)')
    car_num_45 = db.Column(Integer, comment='停車在臨進車道上的車輛總數(45秒)')
    volume_all = db.Column(Integer, comment='臨近車道上的流量(總數)')
    volume_non_hinder = db.Column(Integer, comment='臨近車道上的流量(未受阻)')
    volume_hinder = db.Column(Integer, comment='臨近車道上的流量(受阻)')
    date_group = db.Column(db.String(100), primary_key=True, comment='所有日期紀錄')  # 主鍵
    tc_id = db.Column(db.String(50), primary_key=True, comment='路口ID')  # 主鍵
    date = db.Column(Date, primary_key=True, comment='日期')  # 主鍵

    # 創建組合唯一索引
    __table_args__ = (
        PrimaryKeyConstraint('time_period', 'start_road', 'start_time', 'tc_id', 'date', 'date_group', name='uix_time_period_start_road_start_time_tc_id_date_date_group'),
    )


# 存取延滯分頁二內容
class Delay_basic(db.Model):
    __tablename__ = 'delay_basic'
    road = db.Column(db.String(100), comment='路口名稱')
    tc_id = db.Column(db.String(50), primary_key=True, comment='路口編碼')  # 主鍵
    area = db.Column(db.String(20), comment='行政區域')
    day_peak = db.Column(db.String(20), primary_key=True, comment='尖峰昏峰')  # 主鍵
    date = db.Column(Date, primary_key=True, comment='日期')  # 主鍵
    weather = db.Column(db.String(50), comment='天候')
    intersection_type = db.Column(db.String(50), comment='路口類型')
    t_direction = db.Column(db.String(100), comment='表格方向')
    t_road = db.Column(db.String(100), comment='表格路段名')
    t_direction_2 = db.Column(db.String(100), comment='表格方向')
    t_lane_num = db.Column(db.String(100), comment='表格車道數')
    date_group = db.Column(db.String(100), primary_key=True, comment='所有日期紀錄')  # 主鍵
    owner_name = db.Column(db.String(20), comment='業主名稱')
    project_num = db.Column(db.String(20), comment='專案編號')

    # 創建組合唯一索引
    __table_args__ = (
        PrimaryKeyConstraint('tc_id', 'date', 'day_peak', 'date_group', name='uix_tc_id_date_day_peak_date_group'),
    )


class TcSchema(SQLAlchemyAutoSchema):
    class Meta(SQLAlchemyAutoSchema.Meta):
        model = TC_uploaded_file
        sqla_session = db.session
        load_instance = True