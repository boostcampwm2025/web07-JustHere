const fetchData = async <T,>(
    url: string,
    params: Record<string, string | number>,
): Promise<T> => {
    const queryString = new URLSearchParams(
        Object.entries(params).map(([key, value]) => [key, String(value)]),
    ).toString();
    const fullUrl = `${url}?${queryString}`;

    const response = await fetch(fullUrl, { method: 'GET' });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
};

export default fetchData;
