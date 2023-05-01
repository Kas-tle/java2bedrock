import axios, { AxiosResponse, ResponseType } from "axios";
import { getErrorMessage } from "./error";
import { MessageType, statusMessage } from "./console";


export async function getRequest(domain: string, url: string, headers: any, responseType: ResponseType | undefined = undefined): Promise<AxiosResponse> {
    const retrySeconds = 5;
    const retryTimes = 5;
    const retryTime = retrySeconds * 1000;

    let retries = 0;
    while (retries <= retryTimes) {
        try {
            const response = await axios.get(url, {
                baseURL: `https://${domain}`,
                headers: {
                    'User-Agent':  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/112.0',
                    'Accept-Encoding': 'html',
                    ...headers,
                },
                responseType: responseType,
            });

            return response;
        } catch (error: any) {
            if (error.response && error.response.status === 429) {
                statusMessage(MessageType.Critical, `Rate limit exceeded: ${getErrorMessage(error)}`);
                statusMessage(MessageType.Critical, `Attempt [(${retries+1}/${retryTimes+1})]`);
                retries++;
                await new Promise((resolve) => setTimeout(resolve, retryTime));
            } else if (error.response && error.response.status === 403) {
                statusMessage(MessageType.Critical, `File is not available for download (403 Forbidden): ${getErrorMessage(error)}`);
                statusMessage(MessageType.Critical, `Attempt [(${retries+1}/${retryTimes+1})]`);
                return Promise.reject();
            } else if (error.response && error?.response.status === 404) {
                statusMessage(MessageType.Critical, `File was not found (404 Not found): ${getErrorMessage(error)}`);
                statusMessage(MessageType.Critical, `Attempt [(${retries+1}/${retryTimes+1})]`);
                return Promise.reject();
            } else if (error.response && error.response.status === 524) {
                statusMessage(MessageType.Critical, `Server took too long to respond per Cloudflare's 100 second limit (524 a timeout occurred): ${getErrorMessage(error)}`);
                statusMessage(MessageType.Critical, `Attempt [(${retries+1}/${retryTimes+1})]`);
                retries++;
                await new Promise((resolve) => setTimeout(resolve, retryTime));
            } else if (error.code === 'EAI_AGAIN') {
                statusMessage(MessageType.Critical, `DNS lookup error on request: ${getErrorMessage(error)}`);
                statusMessage(MessageType.Critical, `Attempt [(${retries+1}/${retryTimes+1})]`);
                retries++;
                await new Promise((resolve) => setTimeout(resolve, retryTime));
            } else if (error.response && error?.response.status >= 400 && error?.response.status <= 599) {
                statusMessage(MessageType.Critical, `Response code ${error?.response.status}: ${getErrorMessage(error)}`);
                statusMessage(MessageType.Critical, `Attempt [(${retries+1}/${retryTimes+1})]`);
                retries++;
                await new Promise((resolve) => setTimeout(resolve, retryTime));
            } else {
                statusMessage(MessageType.Error, `Error making get request to https://${domain}${url}: ${getErrorMessage(error)}`);
                throw error;
            }
        }
    }
    statusMessage(MessageType.Error, `Retry limit exceeded. Please try again later. Exiting...`);
    throw new Error('Must exit now!');
}