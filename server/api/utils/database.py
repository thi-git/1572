#!/usr/bin/python
# -*- coding: utf-8 -*-
import os
import time
import tempfile
import pandas as pd
from flask_sqlalchemy import SQLAlchemy

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

db = SQLAlchemy()
file_transaction = 0
hour_map = ['h0', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8', 'h9', 'h10', 'h11', 'h12', 'h13', 'h14', 'h15', 'h16', 'h17', 'h18', 'h19', 'h20', 'h21', 'h22', 'h23']
weekday_map = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']


hour_df = pd.DataFrame({'hr': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]})
week_df = pd.DataFrame({'week_no': [0, 1, 2, 3, 4, 5, 6], 'week_str': ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']})


def int_convert_weekday(int_list):
    res = []
    for idx in int_list:
        res.append(weekday_map[idx])
    return res


def build_holi_sql_str(mode, weekdays):
    holi_filt_str = "holi.is_holiday='是'"
    if mode == 1:
        holi_filt_str = "holi.is_holiday='否'"
    elif mode == 3:
        week_str_list = week_df[week_df['week_no'].isin(weekdays)]['week_str'].to_list()
        weeks_str = "'" + "','".join(week_str_list) + "'"
        holi_filt_str = f"holi.weekday IN ({weeks_str})"
    return holi_filt_str


def filter_holiday_weekday(o_df, start_time, end_time, mode, weekdays):
    res_df = o_df.copy()
    if len(o_df.index) > 0:
        # o_df['infodate'] = o_df['src_time'].dt.strftime('%Y-%m-%d')

        res_df = pd.merge(o_df, holiday_df, on='infodate', how='inner')
        if mode == 1:
            res_df = res_df[res_df['is_holiday'] == '否']
        elif mode == 2:
            res_df = res_df[res_df['is_holiday'] == '是']
        elif mode == 3:
            weekdays_str_list = int_convert_weekday(weekdays)
            res_df = res_df[res_df.weekday.isin(weekdays_str_list)]
    else:
        res_df['infodate'] = ''
        res_df['is_holiday'] = ''
        res_df['weekday'] = ''
    return res_df


def mysql2csv(query, header, db_engine):  # for mysql
    start_t = time.time()
    global file_transaction
    default_path = f'D:/MySQL/Uploads/pd_temp{file_transaction}.csv'
    file_transaction += 1
    if file_transaction > 100:
        file_transaction = 0
    if os.path.isfile(default_path):
        os.remove(default_path)
    print('mysql2csv', time.time() - start_t, file_transaction)
    with db_engine.connect() as con:
        con.execute(f'''{query} INTO OUTFILE '{default_path}' FIELDS TERMINATED BY ',' ENCLOSED BY '' LINES TERMINATED BY '\\n';''')
        print('mysql2csv', time.time() - start_t, file_transaction)
        df = pd.read_csv(default_path, header=None, names=header)
        print('mysql2csv', time.time() - start_t, file_transaction)
        return df


def read_sql_tmpfile(query, db_engine):  # for postgresql
    with tempfile.TemporaryFile() as tmpfile:
        copy_sql = "COPY ({query}) TO STDOUT WITH CSV {head}".format(query=query, head="HEADER")
        conn = db_engine.raw_connection()
        cur = conn.cursor()
        cur.copy_expert(copy_sql, tmpfile)
        tmpfile.seek(0)
        df = pd.read_csv(tmpfile)
        return df
