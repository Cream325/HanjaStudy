from pydantic import BaseModel, Field

class HanjaData(BaseModel):
    '''
    한자 데이터 클래스
    '''

    char: str | None = Field(None, description = '자형')
    '''자형'''

    reading: str | None = Field(None, description = '음차')
    '''음차'''

    meaning: str | None = Field(None, description = '뜻')
    '''뜻'''

    stroke: int = Field(0, description = '획수')
    '''획수'''