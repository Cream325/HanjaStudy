from fastapi import FastAPI
from fastapi import Request
from fastapi import APIRouter
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse as Response

from os import path as os_path