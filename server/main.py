# -*- coding: utf-8 -*-
import os
import eventlet
import logging
import api.utils.responses as resp
from flask import Flask, jsonify, send_from_directory
from flask_swagger import swagger
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from waitress import serve
from api.utils.database import db
from api.utils.responses import response_with
from api.utils.responses import CustomJSONEncoder
from api.config.config import DevelopmentConfig
from flask_compress import Compress
from flask_migrate import Migrate

# routes
from api.routes.ui import ui_record_routes
from api.routes.users import users_routes
from api.routes.sample_file import sample_routes
from api.routes.tc_road_info import tc_road_routes
from api.routes.tc_uploaded_file import tc_routes
from api.routes.road_turning_static import road_turning_routes
from api.routes.road_group import road_group_routes
from api.routes.owner_project import owner_project_routes
from api.routes.quality import quality_routes

import sys
sys.path = [p for p in sys.path if 'dist-packages' not in p]
eventlet.monkey_patch()

SWAGGER_URL = '/api/docs'
app = Flask(__name__)
Compress(app)
CORS(app)
migrate = Migrate(app, db)

app_config = DevelopmentConfig

app.config.from_object(app_config)
app.config['JSON_AS_ASCII'] = False
app.config['JSON_SORT_KEYS'] = False

db.init_app(app)
with app.app_context():
    db.create_all()


app.register_blueprint(ui_record_routes, url_prefix='/api/ui')
app.register_blueprint(users_routes, url_prefix='/api/users')
app.register_blueprint(sample_routes, url_prefix='/api/sample')
app.register_blueprint(tc_road_routes, url_prefix='/api/tc_road')
app.register_blueprint(tc_routes, url_prefix='/api/tc')
app.register_blueprint(road_turning_routes, url_prefix='/api/turning')
app.register_blueprint(road_group_routes, url_prefix='/api/road_group')
app.register_blueprint(owner_project_routes, url_prefix='/api/owner_project')
app.register_blueprint(quality_routes, url_prefix='/api/quality')


app.json_encoder = CustomJSONEncoder


@app.route('/res/<path:folder>/<filename>')
def download_file(folder, filename):
    return send_from_directory(f"{app.config['STATIC_FOLDER']}/{folder}", filename)


@app.after_request
def add_header(response):
    return response


@app.errorhandler(400)
def bad_request(e):
    logging.error(e)
    return response_with(resp.BAD_REQUEST_400)


@app.errorhandler(500)
def server_error(e):
    logging.error(e)
    return response_with(resp.SERVER_ERROR_500)


@app.errorhandler(404)
def not_found(e):
    logging.error(e)
    return response_with(resp.SERVER_ERROR_404)


@app.route("/api/spec")
def spec():
    swag = swagger(app, prefix='/api')
    swag['info']['version'] = "1.0"
    swag['info']['title'] = "1572"
    return jsonify(swag)


app.config['JWT_PUBLIC_KEY'] = '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA5l1zAji7VvjB9NEeh7w9khtl3K9c+/eYyGhpP4XUn9CXVIKjUm4ZaYL51tTM+RHDBlhV3NlG1+xv+BTYRLoNsoSjQNNly95R5Il6zWA9Qu4A//ct5+situn6Sje35IAgKOHKw6JDaK6GA+5GalQo9ei+LtXg02CDFRC3bhFSPFCaghHne/qKnuDofmKxMkeWL9u+e/D9hdRggWe0CfV9S/xZ78jHURDzSOHCfKPdB7ySfZUpJL2g4HLB0B8jGd0vps989YQERDUqtkXm3hVQLul7FCroiNZi1Rc9u5X7P+M9tyqFW0/oopK0bEnE/8WBJZuCu30E/Xr6hXV/E/BZHQIDAQAB\n-----END PUBLIC KEY-----'
app.config['JWT_ALGORITHM'] = 'RS256'
app.config['PROPAGATE_EXCEPTIONS'] = True
jwt = JWTManager(app)
jwt.init_app(app)

# db.init_app(app)
# with app.app_context():
#     db.create_all()

# 檢查目錄是否存在，若不存在則創建目錄
directory_arr = ['export', 'upload', 'upload_record']
for folder_name in directory_arr:
    if not os.path.isdir(f"{DevelopmentConfig.STATIC_FOLDER}/{folder_name}"):
        os.makedirs(f"{DevelopmentConfig.STATIC_FOLDER}/{folder_name}")


if __name__ == "__main__":
    port = 11572
    logging.info(f"Server running on port {port}")
    serve(app, host="0.0.0.0", port=port)

