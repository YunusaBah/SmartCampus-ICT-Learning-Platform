import API from "../services/api";

const errorMessage = async (error) => {
    if (error.response?.data instanceof Blob) {
        try {
            const body = JSON.parse(await error.response.data.text());
            if (typeof body.message === "string") return body.message;
        } catch {
            // Use the request error when the response is not a JSON error body.
        }
    }

    return error.response?.data?.message || error.message || "Unable to download file.";
};

const filenameFromDisposition = (disposition) => {
    const match = disposition?.match(/filename="?([^";]+)"?/i);
    return match?.[1]?.replace(/[\\/:*?"<>|]/g, "_");
};

export const downloadFile = async (resourcePath, fallbackName) => {
    let response;
    try {
        response = await API.request({
            url: resourcePath,
            method: "GET",
            responseType: "blob"
        });
    } catch (error) {
        throw new Error(await errorMessage(error), { cause: error });
    }

    const objectUrl = URL.createObjectURL(response.data);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filenameFromDisposition(response.headers["content-disposition"]) || fallbackName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};
