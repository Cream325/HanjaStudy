import uvicorn
from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from multiprocessing import freeze_support

from controllers import hanja as controller_hanja

app = FastAPI()
app.mount('/static', StaticFiles(directory = 'static'), name = 'static')
app.include_router(controller_hanja.router)

templates = Jinja2Templates(directory = 'templates')

@app.get("/", response_class = HTMLResponse)
async def get_root_page(request: Request):
    return templates.TemplateResponse(name = 'main.html', request = request)

if __name__ == '__main__':
    freeze_support()
    uvicorn.run(app, host = '127.0.0.1', port = 8000, reload = False)