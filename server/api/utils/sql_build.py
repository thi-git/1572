# 如果where_list存在則更新
def sql_insert_if_not_exist(table, insert_dict, where_list, update_dict):
    # update_set_list = []
    # for k, v in update_dict.items():
    #     update_set_list.append(f"{k}='{v}'")
    # update_set_str = ','.join(update_set_list)
    #
    # i_keys_str = ','.join(insert_dict.keys())
    # i_values_str = "'" + "','".join(str(x) for x in insert_dict.values()) + "'"
    #
    # on_str = ','.join(where_list)
    #
    # sql_str = f'''INSERT INTO {table} ({i_keys_str}) VALUES ({i_values_str}) ON CONFLICT
    # ({on_str}) DO UPDATE SET {update_set_str};'''
    # return sql_str
    update_set_list = [f"{k}=:update_{k}" for k in update_dict.keys()]
    update_set_str = ', '.join(update_set_list)

    i_keys_str = ', '.join(insert_dict.keys())
    i_values_str = ', '.join(f":{k}" for k in insert_dict.keys())

    on_str = ', '.join(where_list)

    sql_str = f'''
        INSERT INTO {table} ({i_keys_str}) VALUES ({i_values_str})
        ON CONFLICT ({on_str}) DO UPDATE SET {update_set_str};
        '''

    combined_dict = {f"update_{k}": v for k, v in update_dict.items()}
    combined_dict.update(insert_dict)

    return sql_str, combined_dict


# 插入資料
def sql_insert(table, insert_dict):
    # i_keys_str = ','.join(insert_dict.keys())
    # i_values_str = "'" + "','".join(str(x) for x in insert_dict.values()) + "'"
    # sql_str = f'''INSERT INTO {table} ({i_keys_str}) VALUES ({i_values_str});'''
    # return sql_str
    i_keys_str = ','.join(insert_dict.keys())
    i_values_str = ','.join(':' + key for key in insert_dict.keys())
    sql_str = f'INSERT INTO {table} ({i_keys_str}) VALUES ({i_values_str})'
    return sql_str


# 更新資料
def sql_update(table, where_dict, update_dict):
    # update_set_list = []
    # for k, v in update_dict.items():
    #     update_set_list.append(f'''{k}='{v}' ''')
    # update_set_str = ','.join(update_set_list)
    #
    # where_list = []
    # for k, v in where_dict.items():
    #     where_list.append(f'''{k}='{v}' ''')
    # where_str = ' and '.join(where_list)
    #
    # sql_str = f'''UPDATE {table} SET {update_set_str} WHERE {where_str};'''
    # return sql_str
    update_set_list = [f"{key} = :{key}" for key in update_dict.keys()]
    update_set_str = ', '.join(update_set_list)

    where_list = [f"{key} = :{key}" for key in where_dict.keys()]
    where_str = ' AND '.join(where_list)

    sql_str = f'''UPDATE {table} SET {update_set_str} WHERE {where_str};'''

    return sql_str


# 刪除資料
def sql_delete(table, where_dict):
    # where_list = []
    # for k, v in where_dict.items():
    #     where_list.append(f'''{k}='{v}' ''')
    # where_str = ','.join(where_list)
    #
    # sql_str = f'''DELETE FROM {table} WHERE {where_str};'''
    # return sql_str
    where_list = []
    for k, v in where_dict.items():
        where_list.append(f"{k} = :{k}")
    where_str = ' AND '.join(where_list)

    sql_str = f'''DELETE FROM {table} WHERE {where_str};'''
    return sql_str


# 選取資料
def sql_select(predicate, column_dict, table, where_dict):
    # column_list = []
    # where_list = []
    # for item in column_dict:
    #     column_list.append(f'''{item}''')
    # column_str = ','.join(column_list)
    #
    # if where_dict != {}:
    #     for k, v in where_dict.items():
    #         where_list.append(f'''{k}='{v}' ''')
    #     where_str = ','.join(where_list)
    #
    #     sql_str = f'''SELECT {predicate} {column_str} FROM {table} WHERE {where_str};'''
    # else:
    #     sql_str = f'''SELECT {predicate} {column_str} FROM {table};'''
    # return sql_str

    columns = ', '.join(column_dict)
    sql_str = f"SELECT {predicate} {columns} FROM {table}"

    if where_dict:
        where_conditions = ' AND '.join([f"{k} = :{k}" for k in where_dict.keys()])
        sql_str += f" WHERE {where_conditions}"

    return sql_str, where_dict
