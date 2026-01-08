# -*- coding: utf-8 -*-
import os
import pandas as pd
from api.models.sample_file import Sample_file
from api.utils import responses as resp
from api.utils.responses import response_with
from api.utils.sql_build import *
from api.utils.database import db


# 取得所有範例檔案
def get_all_sample():
    res = pd.read_sql('sample_file', con=db.engine)
    return response_with(resp.SUCCESS_200, value={"data": res.to_dict('records')})
