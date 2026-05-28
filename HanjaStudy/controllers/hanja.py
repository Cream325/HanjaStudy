import controllers

router = controllers.APIRouter()

@router.get("/hanja", response_model = list[list[controllers.HanjaData]])
async def get_hanja_lists():
    '''
    한자 데이터 리스트들 조회
    
    Return
    ------
    list[list[HanjaData]]
        각 급수별 한자 데이터 리스트들
    '''

    return [ controllers.business_hanja.open_hanja_file(i + 1) for i in range(8) ]