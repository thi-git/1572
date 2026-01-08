#!/bin/bash
#vim /etc/profile
#source /etc/profile
#export VENV1428=/mnt/d/dev/venv38/bin/activate  <---path for python venv
#export SERVER1428=/mnt/d/dev/1428_demo/1428/server   <---server
source $VENV1428
cd $SERVER1428 && python main.py