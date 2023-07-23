import axios, { AxiosProgressEvent, AxiosResponse, ResponseType } from "axios";
import { getErrorMessage } from "./error";
import { MessageType, statusMessage } from "./console";
import path from "path";
import * as progress from './progress';


export async function getRequest(urlString: string, headers: any = undefined, responseType: ResponseType | undefined = undefined, progressBar: boolean = true): Promise<AxiosResponse> {
    const retrySeconds = 5;
    const retryTimes = 5;
    const retryTime = retrySeconds * 1000;
    const url = new URL(urlString);

    let retries = 0;
    while (retries <= retryTimes) {
        try {
            const bar = progress.downloadBar()
            if (progressBar) {
                bar.start(100, 0, {prefix: path.basename(urlString)});
            }
            const response = await axios.get(url.pathname, {
                onDownloadProgress: (progressEvent: AxiosProgressEvent) => {
                    if (progressBar) {
                        const totalProgress = progressEvent.total ? progressEvent.total : 1;
                        bar.update(Math.round(((progressEvent.loaded / totalProgress) * 100)));
                    }
                },
                baseURL: `${url.protocol}//${url.host}`,
                headers: {
                    'User-Agent':  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/112.0',
                    'Accept-Encoding': 'html',
                    ...headers,
                },
                responseType: responseType,
            });

            if (progressBar) {
                bar.stop();
            }
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
                statusMessage(MessageType.Error, `Error making get request to ${url.href}: ${getErrorMessage(error)}`);
                throw error;
            }
        }
    }
    statusMessage(MessageType.Error, `Retry limit exceeded. Please try again later. Exiting...`);
    throw new Error('Must exit now!');
}

export async function jsonGetRequest<T>(urlString: string, headers: any = undefined, responseType: ResponseType | undefined = undefined): Promise<T> {
    const retrySeconds = 5;
    const retryTimes = 5;
    const retryTime = retrySeconds * 1000;
    const url = new URL(urlString);

    let retries = 0;
    while (retries <= retryTimes) {
        try {
            const { data } = await axios.get<T>(url.pathname, {
                baseURL: `${url.protocol}//${url.host}`,
                headers: {
                    'User-Agent':  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/112.0',
                    'Accept-Encoding': 'html',
                    ...headers,
                },
                responseType: responseType,
            });

            return data;
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
                statusMessage(MessageType.Error, `Error making get request to ${url.href}: ${getErrorMessage(error)}`);
                throw error;
            }
        }
    }
    statusMessage(MessageType.Error, `Configured retry limit exceeded. Please try again later. Exiting...`);
    throw new Error('Must exit now!');
}