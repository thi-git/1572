import os
import time
import random
import zipfile
import hashlib


class Zip:
    def __init__(self):
        pass

    def zip_file(self, file_list: list, save_location):
        if len(file_list) > 0:
            zip_path = os.path.join(save_location, f'{self.hash()}.zip')
            zip_path = zip_path.replace('\\', '/')

            if not os.path.isdir(save_location):
                os.makedirs(save_location)

            with zipfile.ZipFile(zip_path, mode='w') as zf:
                try:
                    for file in file_list:
                        if os.path.isfile(file):
                            file_path, file_name = os.path.split(file)
                            # os.chdir(file_path)
                            zf.write(file, arcname=file_name)
                    return zip_path

                except zipfile.BadZipfile as e:
                    print("ZIP 檔案錯誤：", e)
                    return None

    def unzip_file(self, file_path, save_location):
        # 檢查檔案格式
        ext = os.path.splitext(file_path)[1]
        if ext == '.zip':
            # 檢查目錄是否存在，若不存在則創建目錄
            if not os.path.isdir(save_location):
                os.makedirs(save_location)
            with zipfile.ZipFile(file_path, mode='r') as zf:
                try:
                    zf.extractall(path=save_location)
                    return os.listdir(save_location)

                except zipfile.BadZipfile as e:
                    print("ZIP 檔案錯誤：", e)
                    return None

    # 產生唯一檔名
    def hash(self):
        m = hashlib.md5()
        for buf in [str(time.time()), str(random.random())]:
            m.update(buf.encode())
        return m.hexdigest()


if __name__ == '__main__':
    zz = Zip()
    print(zz.zip_file([r'D:/1453/1453_backend/server/res/upload/delay/TC001/TC001_2022-07-18_delay.xlsx', r'D:/1453/1453_backend/server/res/upload/volume/TC001/TC001_2022-07-18_volume.xlsx'], r'D:/1453/1453_backend/server/res/export'))
    # print(zz.unzip_file('../source/test.zip', '../upload/csv'))
    # print(zz.hash())
