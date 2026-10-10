import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FaBookOpen, FaDownload, FaEye, FaPlus, FaSearch, FaTimes } from "react-icons/fa";
import API from "../services/api";
import { downloadFile } from "../utils/downloadFile";
import { useAuth } from "../hooks/useAuth";
import MaterialPreviewDialog from "../components/MaterialPreviewDialog";

const fileTypes = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp";

const Materials = () => {
    const { isStaff } = useAuth();
    const [courses, setCourses] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [courseFilter, setCourseFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [uploadError, setUploadError] = useState("");
    const [downloadError, setDownloadError] = useState("");
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [previewMaterial, setPreviewMaterial] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [form, setForm] = useState({ title: "", courseId: "", file: null });
    const fileInput = useRef(null);

    useEffect(() => {
        let active = true;
        const loadMaterials = async () => {
            setLoading(true);
            setLoadError("");
            try {
                const courseResponse = await API.get(isStaff ? "/courses/my" : "/enrollments/my-courses");
                const availableCourses = isStaff
                    ? courseResponse.data
                    : courseResponse.data.map((enrollment) => enrollment.course).filter(Boolean);
                const courseMaterials = await Promise.all(availableCourses.map(async (course) => {
                    const response = await API.get(`/lessons/course/${course.id}`);
                    return response.data.map((material) => ({
                        ...material,
                        courseId: course.id,
                        courseTitle: course.title
                    }));
                }));
                if (active) {
                    setCourses(availableCourses);
                    setMaterials(courseMaterials.flat());
                    setForm((current) => ({
                        ...current,
                        courseId: current.courseId || String(availableCourses[0]?.id || "")
                    }));
                }
            } catch (error) {
                if (active) setLoadError(error.response?.data?.message || "Unable to load shared materials.");
            } finally {
                if (active) setLoading(false);
            }
        };

        loadMaterials();
        return () => { active = false; };
    }, [isStaff]);

    const visibleMaterials = useMemo(() => {
        const query = search.trim().toLowerCase();
        return materials.filter((material) => {
            const matchesCourse = courseFilter === "all" || String(material.courseId) === courseFilter;
            const matchesSearch = !query || `${material.title} ${material.courseTitle} ${material.content || ""}`
                .toLowerCase()
                .includes(query);
            return matchesCourse && matchesSearch;
        });
    }, [courseFilter, materials, search]);

    const closeUpload = () => {
        if (uploading) return;
        setIsUploadOpen(false);
        setUploadError("");
    };

    const handleDownload = async (material) => {
        setDownloadError("");
        try {
            await downloadFile(`/downloads/lesson/${material.id}`, material.fileName || `material-${material.id}`);
        } catch (error) {
            setDownloadError(error.message || "Unable to download this material.");
        }
    };

    const shareMaterial = async (event) => {
        event.preventDefault();
        if (!form.file || !form.courseId) {
            setUploadError("Choose a course and a material file to share.");
            return;
        }
        const payload = new FormData();
        payload.append("title", form.title);
        payload.append("courseId", form.courseId);
        payload.append("file", form.file);
        setUploading(true);
        setUploadError("");
        try {
            const response = await API.post("/lessons", payload, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            const course = courses.find((item) => String(item.id) === form.courseId);
            setMaterials((current) => [{
                ...response.data.lesson,
                courseId: course.id,
                courseTitle: course.title
            }, ...current]);
            setForm((current) => ({ ...current, title: "", file: null }));
            if (fileInput.current) fileInput.current.value = "";
            setIsUploadOpen(false);
            window.dispatchEvent(new Event("smartcampus:dashboard-refresh"));
        } catch (error) {
            setUploadError(error.response?.data?.message || "Unable to share this material.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="page-content materials-page">
            <header className="materials-header">
                <div>
                    <p className="eyebrow">LEARNING RESOURCES</p>
                    <h1>Shared Materials</h1>
                    <p className="subtitle">Browse materials shared in your courses.</p>
                </div>
                {isStaff && (
                    <button
                        type="button"
                        className="create-course-button"
                        aria-label="Share a material"
                        title="Share a material"
                        disabled={!courses.length}
                        onClick={() => {
                            setUploadError("");
                            setIsUploadOpen(true);
                        }}
                    >
                        <FaPlus aria-hidden="true" />
                    </button>
                )}
            </header>

            <div className="materials-controls">
                <label className="catalog-search">
                    <FaSearch aria-hidden="true" />
                    <span className="sr-only">Search materials</span>
                    <input
                        type="search"
                        placeholder="Search materials or courses"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </label>
                <label className="materials-course-filter">
                    <span>Course</span>
                    <select value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}>
                        <option value="all">All courses</option>
                        {courses.map((course) => (
                            <option key={course.id} value={String(course.id)}>{course.title}</option>
                        ))}
                    </select>
                </label>
            </div>

            {loadError && <p className="materials-error" role="alert">{loadError}</p>}
            {downloadError && <p className="materials-error" role="alert">{downloadError}</p>}
            {loading ? (
                <p role="status">Loading shared materials...</p>
            ) : visibleMaterials.length ? (
                <div className="materials-list">
                    {visibleMaterials.map((material) => (
                        <article className="material-item" key={`${material.courseId}-${material.id}`}>
                            <span className="material-item-icon"><FaBookOpen /></span>
                            <div className="material-item-content">
                                <h2>{material.title}</h2>
                                <Link to={`/courses/${material.courseId}?section=materials`} className="material-course-link">
                                    {material.courseTitle}
                                </Link>
                                {material.createdAt && (
                                    <time dateTime={material.createdAt}>
                                        Added {new Date(material.createdAt).toLocaleDateString()}
                                    </time>
                                )}
                                {material.content && <p>{material.content}</p>}
                                {material.videoUrl && <a href={material.videoUrl} target="_blank" rel="noreferrer">Watch video</a>}
                            </div>
                            {material.hasFile && (
                                <div className="material-file-actions">
                                    <button
                                        type="button"
                                        className="material-download"
                                        onClick={() => handleDownload(material)}
                                    >
                                        <FaDownload /> Download
                                    </button>
                                    <button
                                        type="button"
                                        className="material-view"
                                        onClick={() => setPreviewMaterial(material)}
                                    >
                                        <FaEye /> View
                                    </button>
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            ) : (
                <div className="materials-empty">
                    <FaBookOpen aria-hidden="true" />
                    <h2>{materials.length ? "No materials match your filters" : "No shared materials yet"}</h2>
                    <p>{materials.length
                        ? "Try another search or choose a different course."
                        : "Materials shared in your courses will appear here."}</p>
                </div>
            )}

            {isUploadOpen && (
                <div className="course-modal-backdrop" onMouseDown={(event) => {
                    if (event.target === event.currentTarget) closeUpload();
                }}>
                    <section className="course-modal" role="dialog" aria-modal="true" aria-labelledby="share-material-heading">
                        <button
                            type="button"
                            className="course-modal-close"
                            aria-label="Close share material dialog"
                            onClick={closeUpload}
                        >
                            <FaTimes aria-hidden="true" />
                        </button>
                        <h2 id="share-material-heading">Share a material</h2>
                        <p className="course-modal-intro">Choose one of your courses and upload a resource for its students.</p>
                        {uploadError && <p className="course-modal-feedback" role="alert">{uploadError}</p>}
                        <form className="course-create-form" onSubmit={shareMaterial}>
                            <label>
                                Available courses
                                <select
                                    required
                                    value={form.courseId}
                                    onChange={(event) => setForm((current) => ({ ...current, courseId: event.target.value }))}
                                    disabled={uploading}
                                >
                                    <option value="" disabled>Select a course</option>
                                    {courses.map((course) => (
                                        <option key={course.id} value={String(course.id)}>{course.title}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                Material title
                                <input
                                    required
                                    maxLength={255}
                                    value={form.title}
                                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                                    disabled={uploading}
                                />
                            </label>
                            <label>
                                Upload file
                                <input
                                    type="file"
                                    ref={fileInput}
                                    accept={fileTypes}
                                    required
                                    onChange={(event) => setForm((current) => ({ ...current, file: event.target.files?.[0] || null }))}
                                    disabled={uploading}
                                />
                            </label>
                            <div className="course-modal-actions">
                                <button type="button" className="course-cancel-button" onClick={closeUpload} disabled={uploading}>Cancel</button>
                                <button type="submit" className="btn btn-inline" disabled={uploading}>
                                    {uploading ? "Sharing..." : "Share material"}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
            {previewMaterial && <MaterialPreviewDialog
                key={previewMaterial.id}
                resourcePath={`/downloads/lesson/${previewMaterial.id}`}
                fileName={previewMaterial.fileName || previewMaterial.title}
                onClose={() => setPreviewMaterial(null)}
            />}
        </div>
    );
};

export default Materials;
