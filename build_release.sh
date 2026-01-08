#編譯重要程式碼
RELEASE_PATH=/mnt/d/dev/1428_fet_gitlab/sml1428/server
CODE_PATH=./server

cp /home/thia/airflow/dags/p1428_dag_road_vd.py /mnt/d/dev/1428_fet_gitlab/sml1428/dags/

for file in $CODE_PATH/api/lib/*.py
do
   name="${file%.*}"
   cp $file ${name}.pyx
   echo ${name}.pyx
done

date && echo "1.build lib"
python3 setup.py build_ext --inplace
#移除舊程式
echo "2.remove old"
rm -r $RELEASE_PATH
mkdir -p $RELEASE_PATH
#拷貝新程式
echo "3.copy new"
cp -r $CODE_PATH $RELEASE_PATH/..
#移除重要程式
echo "4.remove py"
rm -r $RELEASE_PATH/api/lib/*.py
rm -r $RELEASE_PATH/api/lib/*.pyx
rm -r $RELEASE_PATH/api/lib/*.c
rm -r $RELEASE_PATH/api/lib/*.pyd


rm -r $CODE_PATH/api/lib/*.pyx
rm -r $CODE_PATH/api/lib/*.c
rm -r $CODE_PATH/api/lib/*.pyd
rm -r $CODE_PATH/api/lib/*.so

echo "5.copy front end file" && date
rm -r $RELEASE_PATH/../front_end/sml/*
sshpass -p "1qazxcvb@thi" scp -r thiits@220.130.185.36:/var/www/html/sml/* $RELEASE_PATH/../front_end/sml

echo "5.dump 1428 db" && date
export PGPASSWORD="thi168168"
rm -r $RELEASE_PATH/../prepare_data/sml1428.dump
pg_dump -h 220.130.185.36 -U root -Fc sml_its_1428 > $RELEASE_PATH/../prepare_data/sml1428.dump

echo "!!.complete" && date
