/** 파라미터 없이 GET API 호출 */
export async function getAPI(url, callback) {
    await fetch(url, {
        method: 'GET'
    })
    .then(response => {
        if(!response.ok) {
            throw new Error(`Unexpected Error: ${response.json()}`);
        }

        return response.json();
    })
    .then(data => {
        callback(data);
    })
    .catch(error => {
        console.error(`Error: ${error}`)
    });
}

/** GET API 호출 */
export async function getAPIWithParameter(url, parameters, callback) {
    const queryString = new URLSearchParams(parameters).toString();
    const requestUrl = `${url}?${queryString}`;

    await getAPI(requestUrl, callback);
}

/** 파라미터 없이 POST API 호출 */
export async function postAPI(url, bodyData, callback) {
    await fetch(url, {
        method: 'POST',
        body: JSON.stringify(bodyData)
    })
    .then(response => {
        if(!response.ok) {
            throw new Error(`Unexpected Error: ${response.json()}`);
        }

        return response.json();
    })
    .then(data => {
        callback(data);
    })
    .catch(error => {
        console.error(`Error: ${error}`)
    });
}

/** POST API 호출 */
export async function postAPIWithParameter(url, parameters, bodyData, callback) {
    const queryString = new URLSearchParams(parameters).toString();
    const requestUrl = `${url}?${queryString}`;

    await postAPI(requestUrl, bodyData, callback);
}