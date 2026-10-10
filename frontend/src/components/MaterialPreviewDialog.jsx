import { useEffect, useState } from "react";
import { FaDownload, FaTimes } from "react-icons/fa";
import API from "../services/api";
import { downloadFile } from "../utils/downloadFile";

const MaterialPreviewDialog = ({ resourcePath, fileName, onClose }) => {
    const [file, setFile] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        let objectUrl;

        API.request({ url: resourcePath, method: "GET", responseType: "blob" })
            .then((response) => {
                if (!active) return;
                objectUrl = URL.createObjectURL(response.data);
                setFile({
                    url: objectUrl,
                    type: response.data.type
                });
            })
            .catch((requestError) => {
                if (active) setError(requestError.response?.data?.message || "Unable to preview this material.");
            });

        return () => {
            active = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [resourcePath]);

    const canPreview = file && (
        file.type.startsWith("image/") ||
        file.type === "application/pdf" ||
        file.type.startsWith("text/")
    );

    const handleDownload = async () => {
        try {
            await downloadFile(resourcePath, fileName || "course-material");
        } catch (downloadError) {
            setError(downloadError.message || "Unable to download this material.");
        }
    };

    return (
        <div className="material-preview-backdrop" onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
        }}>
            <section className="material-preview-dialog" role="dialog" aria-modal="true" aria-label={`Preview ${fileName || "course material"}`}>
                <header className="material-preview-header">
                    <strong>{fileName || "Course material"}</strong>
                    <button type="button" aria-label="Close preview" onClick={onClose}><FaTimes /></button>
                </header>
                {error && <p className="material-preview-message" role="alert">{error}</p>}
                {!file && !error && <p className="material-preview-message" role="status">Loading preview...</p>}
                {file && canPreview && (file.type.startsWith("image/")
                    ? <img className="material-preview-image" src={file.url} alt={fileName || "Course material"} />
                    : <iframe className="material-preview-frame" src={file.url} title={fileName || "Course material preview"} />)}
                {file && !canPreview && (
                    <div className="material-preview-message">
                        <p>This file type cannot be previewed in the browser.</p>
                        <button type="button" className="btn btn-inline" onClick={handleDownload}><FaDownload /> Download material</button>
                    </div>
                )}
            </section>
        </div>
    );
};

export default MaterialPreviewDialog;
