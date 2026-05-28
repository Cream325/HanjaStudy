import businesses

def open_hanja_file(file_level: int):
    '''
    CSV 파일에서 한자 데이터 불러오기
    
    Parameter
    ------
    file_level: int
        한자 급수

    Return
    ------
    list[HanjaData]
        입력받은 급수에 따른 한자 데이터 리스트
    '''
    
    with open('./HANJA_FILES/HANJA_LEVEL{level}.csv'.format(level = file_level), 'r', encoding = 'UTF-8') as file:
        csv_reader = businesses.csv.reader(file)
        next(csv_reader)

        return [ businesses.HanjaData(char = row[0], meaning = row[1], reading = row[2], stroke = int(row[3])) for row in csv_reader ]