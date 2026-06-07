import uvicorn
from multiprocessing import freeze_support

import initial
from controllers import hanja as controller_hanja

main_file_path = initial.os_path.abspath(__file__)
static_dir_path = initial.os_path.join(main_file_path, '../static')
template_dir_path = initial.os_path.join(main_file_path, '../templates')

app = initial.FastAPI()
app.mount('/static', initial.StaticFiles(directory = static_dir_path), name = 'static')
app.include_router(controller_hanja.router)
templates = initial.Jinja2Templates(directory = template_dir_path)

@app.get("/", response_class = initial.Response)
async def get_root_page(request: initial.Request):
    return templates.TemplateResponse(name = 'main.html', request = request)

if __name__ == '__main__':
    freeze_support()
    uvicorn.run(app, host = '127.0.0.1', port = 8000, reload = False)


# 수정 사항
# 저장된 한자 데이터 표준화 -> 여러 의미를 가진 한자의 뜻과 음 표기를 위함

# 로컬에서 일부 아이콘이 보이지 않는 현상 수정 필요 -> 모든 아이콘은 로컬에서 가져오도록 수정
# 반응형 웹페이지 고려 -> 웹페이지 크기 변경 시 Canvas 크기가 이상하게 조절됨, 수정 필요
# 필기 취소|복구|지우기 버튼 위치 조정 -> 굵기|색상 버튼 반대편에 조정

# 추가 사항
# 필기 연습(Canvas) 저장 기능 추가 -> 관련 DB 개편 필요
# 단어장 저장 및 불러오기 기능 추가 -> 관련 DB 추가 및 개편 필요, 로컬 데이터일 경우 데이터 저장 형식 정의 필요
# AI 필기 테스트 기능 고려(Tesseract OCR이나 Easy OCR 사용 고려)