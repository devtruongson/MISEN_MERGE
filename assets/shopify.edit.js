console.log("shopify.edit.js loaded");

const elements = document.querySelectorAll('[data-meta]');
const valuesDefault = {};
const newValues = {};
const body = document.body;
const btnSaveChange = document.createElement("button");
btnSaveChange.innerHTML = "Save Changes";
btnSaveChange.classList.add("btn-save-changes");
body.appendChild(btnSaveChange);
btnSaveChange.style.display = "none";
btnSaveChange.addEventListener("click", handleUpdateMetaFields)

const search = window.location.search;
const params = new URLSearchParams(search);
if (params.get("misen") === "auth-login-section") {
    onModalLoginMisen();
}
const loadingOverlay = document.createElement("div");
loadingOverlay.className = `
  fixed inset-0 bg-black/50 flex items-center justify-center z-[999999999]
`;
loadingOverlay.innerHTML = `
  <div class="flex flex-col items-center gap-4 text-white">
    <div class="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
    <span class="text-lg font-medium">Vui lòng chờ...</span>
  </div>
`;

async function fileToBase64(file) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    return new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

async function fetchUrlToBase64(url, opts = {}) {
    const { dataUrl = false, throwOnHttpError = true } = opts;

    const res = await fetch(url);
    if (throwOnHttpError && !res.ok) {
        throw new Error(`HTTP error ${res.status} ${res.statusText}`);
    }

    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const buffer = await res.arrayBuffer();

    function arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        const chunkSize = 0x8000;
        let binary = '';
        for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode.apply(null, chunk);
        }
        return btoa(binary);
    }

    const base64 = arrayBufferToBase64(buffer);
    return dataUrl ? `data:${contentType};base64,${base64}` : base64;
}


const checkToken = localStorage.getItem("shopify_misen_login");
if (checkToken) {
    const btnLogout = document.createElement("button");
    btnLogout.innerHTML = "Logout Misen Edit";
    btnLogout.classList.add("btn-logout");
    body.appendChild(btnLogout);
    btnLogout.addEventListener("click", () => {
        const constfirm = window.confirm("Are you sure to logout?");
        if (!constfirm) return;
        localStorage.removeItem("shopify_misen_login");
        window.location.reload();
    });

    elements.forEach(el => {
        // Lấy tất cả các thuộc tính data-meta
        const metaKeys = el.getAttribute("data-meta")?.split(' ') || [];
        const typeMeta = el.getAttribute("data-type");

        // Xử lý từng meta key
        metaKeys.forEach((metaKey, index) => {
            if (!metaKey.trim()) return;

            const uniqueKey = metaKeys.length > 1 ? `${metaKey}_${index}` : metaKey;

            if (!typeMeta) {
                valuesDefault[uniqueKey] = el.innerText;
                newValues[uniqueKey] = el.innerText;
            } else if (typeMeta === "icon") {
                const iconClass = el.className.split(' ').find(c => c.startsWith('fa-'))?.substring(3) || '';
                valuesDefault[uniqueKey] = iconClass;
                newValues[uniqueKey] = iconClass;
            } else if (typeMeta === "image") {
                valuesDefault[uniqueKey] = {
                    url: el.src,
                    type: "image"
                };
                newValues[uniqueKey] = {
                    url: el.src,
                    type: "image"
                };
            }
            else if (typeMeta === "gallery") {
                const images = Array.from(el.querySelectorAll('img')).map(img => {
                    return {
                        url: img.src,
                        type: "image"
                    };
                });
                valuesDefault[uniqueKey] = images;
                newValues[uniqueKey] = images;
            }
        });

        el.setAttribute("contenteditable", "true");
        el.classList.add("editMode");

        if (typeMeta === "image") {
            // Luôn mở modal cho image (dù 1 hay nhiều meta)
            el.addEventListener("click", (e) => {
                e.preventDefault();
                openImageEditModal(metaKeys, el);
            });
        } else if (typeMeta === "icon") {
            el.addEventListener("click", () => {
                const currentIcon = el.className.split(' ').find(c => c.startsWith('fa-'))?.substring(3) || '';
                const iconClass = prompt("Enter FontAwesome icon class (without 'fa-'):", currentIcon);

                if (iconClass) {
                    const newClassName = el.className.split(' ')
                        .filter(c => !c.startsWith('fa-'))
                        .join(' ') + ' fa-' + iconClass;

                    el.className = newClassName;

                    // Cập nhật tất cả meta keys cho icon
                    metaKeys.forEach((metaKey, index) => {
                        if (!metaKey.trim()) return;
                        const uniqueKey = metaKeys.length > 1 ? `${metaKey}_${index}` : metaKey;
                        newValues[uniqueKey] = iconClass;
                    });

                    if (!_.isEqual(valuesDefault, newValues)) {
                        btnSaveChange.style.display = "block";
                    } else {
                        btnSaveChange.style.display = "none";
                    }
                }
            });
        }
        if (typeMeta === "gallery") {
            el.addEventListener("click", () => {
                // Sử dụng meta key đầu tiên cho gallery modal
                const firstMetaKey = metaKeys[0];
                if (firstMetaKey) {
                    openGalleryModal(firstMetaKey);
                }
            });
        }
        else if (!typeMeta) {
            // Nếu có nhiều hơn 1 meta attribute, mở modal để edit
            if (metaKeys.length > 1) {
                el.addEventListener("click", (e) => {
                    e.preventDefault();
                    openTextEditModal(metaKeys, el);
                });
            } else {
                // Nếu chỉ có 1 meta attribute, edit inline như cũ
                el.addEventListener("click", (e) => {
                    e.preventDefault();
                });
                const onChange = (event) => {
                    // Cập nhật tất cả meta keys cho text content
                    metaKeys.forEach((metaKey, index) => {
                        if (!metaKey.trim()) return;
                        const uniqueKey = metaKeys.length > 1 ? `${metaKey}_${index}` : metaKey;
                        newValues[uniqueKey] = event.target.innerText;
                    });

                    if (!_.isEqual(valuesDefault, newValues)) {
                        btnSaveChange.style.display = "block";
                    } else {
                        btnSaveChange.style.display = "none";
                    }
                }

                el.addEventListener("input", onChange);
            }
        }
    });
}

async function handleUpdateMetaFields() {
    const confirm = window.confirm("Are you sure you want to update the product?");
    if (!confirm) return;

    // Map lại từ unique keys về original meta keys
    const mappedMetafields = {};
    Object.keys(newValues).forEach(uniqueKey => {
        // Tìm element có chứa uniqueKey này
        const elements = document.querySelectorAll('[data-meta]');
        elements.forEach(el => {
            const metaKeys = el.getAttribute("data-meta")?.split(' ') || [];
            metaKeys.forEach((metaKey, index) => {
                if (!metaKey.trim()) return;
                const expectedUniqueKey = metaKeys.length > 1 ? `${metaKey}_${index}` : metaKey;
                if (expectedUniqueKey === uniqueKey) {
                    // Sử dụng key gốc thay vì unique key
                    mappedMetafields[metaKey] = newValues[uniqueKey];
                }
            });
        });
    });

    console.log("check new save: ", {
        token: localStorage.getItem("shopify_misen_login"),
        metafields: mappedMetafields,
        product: productData,
        domain: Shopify.shop,
    });

    try {
        document.body.appendChild(loadingOverlay);
        const res = await fetch("https://n8n.misencorp.com/webhook/update", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                token: localStorage.getItem("shopify_misen_login"),
                metafields: mappedMetafields,
                product: productData,
                domain: Shopify.shop,
            }),
        });
        const data = await res.json();
        if (data.code === 0) {
            btnSaveChange.style.display = "none";
        }
    } catch (error) {
        console.error("Error during login:", error);
    } finally {
        loadingOverlay.remove();
    }
}

function onModalLoginMisen() {
    let root = document.getElementById("react-modal-root");
    if (!root) {
        root = document.createElement("div");
        root.id = "react-modal-root";
        document.body.appendChild(root);
    }

    const modalAuth = ReactDOM.createRoot(root);
    modalAuth.render(<FormLogin />)
}

function FormLogin() {
    const [state, setState] = React.useState({
        username: '',
        password: '',
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            document.body.appendChild(loadingOverlay);
            const res = await fetch("https://n8n.misencorp.com/webhook/shopify-login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(state),
            });
            const data = await res.json();
            if (data.code != 0) {
                alert(data.msg || "Login failed");
            } else {
                localStorage.setItem("shopify_misen_login", data.token);
                alert("Login successful");
                const url = window.location.origin + window.location.pathname + window.location.hash;
                window.location.href = url;
            }
        } catch (error) {
            console.error("Error during login:", error);
        } finally {
            loadingOverlay.remove();
        }
    }

    return <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
        <div class="px-6 py-12 lg:px-8 bg-[#fff] rounded-lg shadow-lg">
            <div class="sm:mx-auto sm:w-full sm:max-w-sm">
                <img src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600" alt="Your Company" class="mx-auto h-10 w-auto" />
                <h2 class="mt-10 text-center text-2xl/9 font-bold tracking-tight text-gray-900">Sign in to your account</h2>
            </div>
            <div class="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
                <form action="#" method="POST" class="space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label for="username" class="block text-sm/6 font-medium text-gray-900">Username address</label>
                        <div class="mt-2">
                            <input value={state.username} onChange={(e) => setState({ ...state, username: e.target.value })} id="username" type="username" name="username" required autocomplete="username" class="block border w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6" />
                        </div>
                    </div>

                    <div>
                        <div class="flex items-center justify-between">
                            <label for="password" class="block text-sm/6 font-medium text-gray-900">Password</label>
                        </div>
                        <div class="mt-2">
                            <input id="password" value={state.password} onChange={(e) => setState({ ...state, password: e.target.value })} type="password" name="password" required autocomplete="current-password" class="border block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6" />
                        </div>
                    </div>

                    <div>
                        <button type="submit" class="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Sign in</button>
                    </div>
                </form>
            </div>
        </div>
    </div>;
}

function openImageGeneratorModal(uniqueKey) {
    let root = document.getElementById("react-modal-root");
    if (!root) {
        root = document.createElement("div");
        root.id = "react-modal-root";
        document.body.appendChild(root);
    }

    const generatorRoot = ReactDOM.createRoot(root);

    generatorRoot.render(
        <ImageGeneratorModal
            uniqueKey={uniqueKey}
            onSelectImage={(imageUrl) => {
                // Event sẽ được dispatch từ bên trong modal
                // Không cần dispatch lại ở đây để tránh trùng lặp
            }}
            onClose={() => {
                generatorRoot.unmount();
            }}
        />
    );
}

function openImageEditModal(metaKeys, element) {
    let root = document.getElementById("react-modal-root");
    if (!root) {
        root = document.createElement("div");
        root.id = "react-modal-root";
        document.body.appendChild(root);
    }

    const imageEditRoot = ReactDOM.createRoot(root);

    const currentValues = {};
    metaKeys.forEach((metaKey, index) => {
        if (!metaKey.trim()) return;
        const uniqueKey = metaKeys.length > 1 ? `${metaKey}_${index}` : metaKey;

        if (newValues[uniqueKey]) {
            if (typeof newValues[uniqueKey] === 'object' && newValues[uniqueKey].url) {
                currentValues[uniqueKey] = newValues[uniqueKey].url;
            } else {
                currentValues[uniqueKey] = newValues[uniqueKey];
            }
        } else if (metaKey.includes('image') && !metaKey.includes('alt')) {
            currentValues[uniqueKey] = element.src || '';
            if (metaKeys.length === 1) {
                currentValues[`${uniqueKey}_alt`] = element.alt || '';
            }
        } else if (metaKey.includes('alt')) {
            currentValues[uniqueKey] = element.alt || '';
        } else {
            currentValues[uniqueKey] = element.innerText || '';
        }
    });

    imageEditRoot.render(
        <ImageEditModal
            metaKeys={metaKeys}
            currentValues={currentValues}
            element={element}
            onSave={(updatedValues) => {
                Object.keys(updatedValues).forEach(key => {
                    const metaKey = metaKeys.find((mk, idx) => {
                        const uniqueKey = metaKeys.length > 1 ? `${mk}_${idx}` : mk;
                        return uniqueKey === key;
                    });

                    if (metaKey && metaKey.includes('image') && !metaKey.includes('alt')) {
                        newValues[key] = {
                            url: updatedValues[key],
                            type: "image"
                        };
                    } else {
                        newValues[key] = updatedValues[key];
                    }
                });

                metaKeys.forEach((metaKey, index) => {
                    if (!metaKey.trim()) return;
                    const uniqueKey = metaKeys.length > 1 ? `${metaKey}_${index}` : metaKey;
                    const value = updatedValues[uniqueKey];

                    if (value) {
                        if (metaKey.includes('image') && !metaKey.includes('alt')) {
                            element.src = value;
                            if (metaKeys.length === 1) {
                                const altValue = updatedValues[`${uniqueKey}_alt`];
                                if (altValue !== undefined) {
                                    element.alt = altValue;
                                }
                            }
                        }
                        else if (metaKey.includes('alt')) {
                            element.alt = value;
                        }
                    }
                });

                if (!_.isEqual(valuesDefault, newValues)) {
                    btnSaveChange.style.display = "block";
                } else {
                    btnSaveChange.style.display = "none";
                }
            }}
            onClose={() => {
                imageEditRoot.unmount();
            }}
        />
    );
}

function openTextEditModal(metaKeys, element) {
    let root = document.getElementById("react-modal-root");
    if (!root) {
        root = document.createElement("div");
        root.id = "react-modal-root";
        document.body.appendChild(root);
    }

    const textEditRoot = ReactDOM.createRoot(root);

    const currentValues = {};
    metaKeys.forEach((metaKey, index) => {
        if (!metaKey.trim()) return;
        const uniqueKey = metaKeys.length > 1 ? `${metaKey}_${index}` : metaKey;

        if (newValues[uniqueKey]) {
            if (typeof newValues[uniqueKey] === 'object' && newValues[uniqueKey].url) {
                currentValues[uniqueKey] = newValues[uniqueKey].url;
            } else {
                currentValues[uniqueKey] = newValues[uniqueKey];
            }
        } else if (metaKey.includes('link') || metaKey.includes('url') || metaKey.includes('href')) {
            currentValues[uniqueKey] = element.href || '';
        } else if (metaKey.includes('image') && !metaKey.includes('alt')) {
            currentValues[uniqueKey] = element.src || '';
        } else if (metaKey.includes('alt')) {
            currentValues[uniqueKey] = element.alt || '';
        } else {
            currentValues[uniqueKey] = element.innerText || '';
        }
    });

    textEditRoot.render(
        <TextEditModal
            metaKeys={metaKeys}
            currentValues={currentValues}
            element={element}
            onSave={(updatedValues) => {
                Object.keys(updatedValues).forEach(key => {
                    newValues[key] = updatedValues[key];
                });

                metaKeys.forEach((metaKey, index) => {
                    if (!metaKey.trim()) return;
                    const uniqueKey = metaKeys.length > 1 ? `${metaKey}_${index}` : metaKey;
                    const value = updatedValues[uniqueKey];

                    if (value) {
                        if (metaKey.includes('link') || metaKey.includes('url') || metaKey.includes('href')) {
                            element.href = value;
                        }
                        else if (metaKey.includes('image') && !metaKey.includes('alt')) {
                            element.src = value;
                        }
                        else if (metaKey.includes('alt')) {
                            element.alt = value;
                        }
                        else if (metaKey.includes('text') || metaKey.includes('title') || metaKey.includes('label')) {
                            element.innerText = value;
                        }
                        else {
                            element.innerText = value;
                        }
                    }
                });

                if (!_.isEqual(valuesDefault, newValues)) {
                    btnSaveChange.style.display = "block";
                } else {
                    btnSaveChange.style.display = "none";
                }
            }}
            onClose={() => {
                textEditRoot.unmount();
            }}
        />
    );
}

function openGalleryModal(metaKey) {
    let root = document.getElementById("react-modal-root");
    if (!root) {
        root = document.createElement("div");
        root.id = "react-modal-root";
        document.body.appendChild(root);
    }

    const galleryRoot = ReactDOM.createRoot(root);

    galleryRoot.render(
        <GalleryModal
            images={Array.isArray(newValues[metaKey]) ? newValues[metaKey] : []}
            onSave={(images) => {
                Object.keys(newValues).forEach(key => {
                    if (key === metaKey || key.startsWith(metaKey + '_')) {
                        newValues[key] = images;
                    }
                });

                if (!_.isEqual(valuesDefault, newValues)) {
                    btnSaveChange.style.display = "block";
                } else {
                    btnSaveChange.style.display = "none";
                }

                const elements = document.querySelectorAll(`[data-meta*="${metaKey}"]`);
                elements.forEach(elContainer => {
                    const metaKeys = elContainer.getAttribute("data-meta")?.split(' ') || [];
                    if (metaKeys.includes(metaKey)) {
                        let elImage = elContainer.querySelector('img');
                        if (!elImage) {
                            elImage = document.createElement("img");
                        }
                        const className = elImage.getAttribute("class") || "";
                        elContainer.innerHTML = "";
                        images.forEach((file) => {
                            const img = document.createElement("img");
                            img.className = className;
                            img.src = file.url;
                            elContainer.appendChild(img);
                        });
                    }
                });
            }}
            onClose={() => {
                galleryRoot.unmount();
            }}
        />
    );
}

const ImageGeneratorModal = ({ uniqueKey, onSelectImage, onClose }) => {
    const { useState, useEffect } = React;

    // Auto instruction và options configuration theo JSON schema
    const autoConfig = {
        mainUSP: {
            autoInstruction: "Extract key differentiator from product details",
            options: ["auto", "manual_input"]
        },
        productSize: {
            autoInstruction: "Determine size from product type",
            options: ["auto", "tiny", "small", "medium", "large", "oversized"]
        },
        targetCustomer: {
            autoInstruction: "Identify target demographic from context",
            options: ["auto", "everyone", "men", "women", "professionals", "seniors", "pet_owners"]
        },
        priceRange: {
            autoInstruction: "Assess price tier from product category",
            options: ["auto", "budget", "mid", "premium", "luxury"]
        },
        sectionName: {
            autoInstruction: "Analyze product type and description to select most relevant section",
            options: ["auto", "logo", "homepage_banner", "hero_image", "product_gallery", "features_benefits", "how_it_works", "how_to_use", "before_after", "customer_reviews", "problem_agitation", "solution_introduction", "scientific_section", "research_highlights", "visual_comparison", "lifestyle_context"]
        },
        contentGoal: {
            autoInstruction: "Match goal to section purpose",
            options: ["auto", "build_trust", "show_value", "explain_function", "prove_results", "create_desire", "remove_doubts", "drive_action"]
        },
        visualStyle: {
            autoInstruction: "Select style fitting product and goal",
            options: ["auto", "professional_studio", "lifestyle_natural", "technical_diagram", "ugc_authentic", "3d_cgi", "mixed"]
        }
    };

    // Suggested image count cho mỗi section theo JSON schema
    const sectionImageCount = {
        "logo": 1,
        "homepage_banner": 3,
        "hero_image": 3,
        "product_gallery": 7,
        "features_benefits": 5,
        "how_it_works": 4,
        "how_to_use": 5,
        "before_after": 3,
        "customer_reviews": 6,
        "problem_agitation": 2,
        "solution_introduction": 3,
        "scientific_section": 4,
        "research_highlights": 3,
        "visual_comparison": 3,
        "lifestyle_context": 4
    };

    // Instruction key mapping cho mỗi section theo JSON schema
    const sectionInstructionKeys = {
        "logo": "logo_instruction",
        "homepage_banner": "homepage_banner_instruction",
        "hero_image": "hero_image_instruction",
        "product_gallery": "product_gallery_instruction",
        "features_benefits": "features_benefits_instruction",
        "how_it_works": "how_it_works_instruction",
        "how_to_use": "how_to_use_instruction",
        "before_after": "before_after_instruction",
        "customer_reviews": "customer_reviews_instruction",
        "problem_agitation": "problem_agitation_instruction",
        "solution_introduction": "solution_introduction_instruction",
        "scientific_section": "scientific_section_instruction",
        "research_highlights": "research_highlights_instruction",
        "visual_comparison": "visual_comparison_instruction",
        "lifestyle_context": "lifestyle_context_instruction"
    };

    const [formData, setFormData] = useState({
        // Instruction Settings
        isUseInstruction: true,

        // Product Info - đọc từ productData
        brandName: productData?.brandName || '',
        productName: productData?.title || '',
        productCategory: productData?.productCategory || '',
        productType: productData?.productType || '',
        mainUSP: 'auto',
        mainUSPManual: '', // Để lưu giá trị manual input
        productSize: 'auto',
        targetCustomer: 'auto',
        priceRange: 'auto',

        // Section Configuration - chỉ tạo ảnh cho 1 section
        sectionName: 'auto',
        sectionDescription: '',
        contentGoal: 'auto',
        visualStyle: 'auto',

        // Image Settings
        imageSize: 'square_hd',
        imageResolution: '2K',
        maxImages: 'auto',

        // Reference Images - chỉ giữ custom upload theo JSON schema
        customImages: [],
    });

    // State cho modal generate
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImages, setGeneratedImages] = useState([]);
    const [error, setError] = useState('');

    // State cho lightbox
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // State cho reference images lightbox
    const [refLightboxOpen, setRefLightboxOpen] = useState(false);
    const [currentRefImageIndex, setCurrentRefImageIndex] = useState(0);

    // State cho minimize/maximize modal
    const [isMinimized, setIsMinimized] = useState(false);

    // State cho revision system
    const [configRevisions, setConfigRevisions] = useState([]);
    const [showRevisions, setShowRevisions] = useState(false);
    const [confirmRevert, setConfirmRevert] = useState(null);

    // localStorage keys
    const CONFIG_REVISIONS_KEY = `misen_config_revisions_${uniqueKey}`;
    const LATEST_CONFIG_KEY = `misen_latest_config_${uniqueKey}`;

    // Hàm lưu config vào localStorage (chỉ khi generate thành công)
    const saveConfigRevision = (config, action = 'generate_success', generatedImageUrls = []) => {
        // Chỉ lưu revision khi generate thành công
        if (action !== 'generate_success') {
            return;
        }

        const revision = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            config: JSON.parse(JSON.stringify(config)), // Deep copy
            generatedImages: generatedImageUrls.map(img => ({
                url: img.url,
                revised_prompt: img.revised_prompt
            })),
            action: action,
            description: generateRevisionDescription(config, action, generatedImageUrls.length)
        };

        // Lấy revisions hiện tại từ localStorage
        const existingRevisions = JSON.parse(localStorage.getItem(CONFIG_REVISIONS_KEY) || '[]');

        // Thêm revision mới vào đầu mảng
        const updatedRevisions = [revision, ...existingRevisions];

        // Giữ lại tối đa 20 revisions
        const limitedRevisions = updatedRevisions.slice(0, 20);

        // Lưu vào localStorage
        localStorage.setItem(CONFIG_REVISIONS_KEY, JSON.stringify(limitedRevisions));
        localStorage.setItem(LATEST_CONFIG_KEY, JSON.stringify(config));

        // Cập nhật state
        setConfigRevisions(limitedRevisions);

        console.log('Config saved as successful generation revision:', revision.description);
    };

    // Hàm tạo mô tả cho revision
    const generateRevisionDescription = (config, action, imageCount = 0) => {
        const timestamp = new Date().toLocaleString('vi-VN');
        const productName = config.productName || 'Unnamed Product';
        const sectionName = config.sectionName || 'auto';

        switch (action) {
            case 'generate_success':
                return `Successfully generated ${imageCount} images for "${productName}" - ${sectionName} section (${timestamp})`;
            default:
                return `Config for "${productName}" (${timestamp})`;
        }
    };

    // Hàm load revisions từ localStorage
    const loadRevisions = () => {
        const saved = JSON.parse(localStorage.getItem(CONFIG_REVISIONS_KEY) || '[]');
        setConfigRevisions(saved);
    };

    // Hàm revert về một revision
    const revertToRevision = (revisionId) => {
        const revision = configRevisions.find(r => r.id === revisionId);
        if (revision) {
            setFormData(revision.config);
            // Khôi phục generated images nếu có
            if (revision.generatedImages && revision.generatedImages.length > 0) {
                setGeneratedImages(revision.generatedImages);
            }
            setConfirmRevert(null);
            console.log('Reverted to revision:', revision.description);
        }
    };

    // Hàm xóa tất cả revisions
    const clearAllRevisions = () => {
        localStorage.removeItem(CONFIG_REVISIONS_KEY);
        setConfigRevisions([]);
        console.log('All revisions cleared');
    };

    // Load revisions khi component mount
    useEffect(() => {
        loadRevisions();

        // Load latest config nếu có
        const latestConfig = localStorage.getItem(LATEST_CONFIG_KEY);
        if (latestConfig) {
            try {
                const parsed = JSON.parse(latestConfig);
                setFormData(prev => ({ ...prev, ...parsed }));
            } catch (e) {
                console.error('Error loading latest config:', e);
            }
        }
    }, []);

    // Cập nhật prompt dựa trên formData khi thay đổi
    useEffect(() => {
        const generatePrompt = () => {
            // Lấy giá trị mainUSP: nếu chọn manual_input thì dùng mainUSPManual, không thì dùng mainUSP
            const mainUSPValue = formData.mainUSP === 'manual_input' ? formData.mainUSPManual : formData.mainUSP;

            return `Generate image in ${formData.visualStyle} style for ${formData.productName} (${mainUSPValue}). 
              Section: ${formData.sectionName}. Description: ${formData.sectionDescription || 'Show the product in use'}. 
              Goal: ${formData.contentGoal}. Target: ${formData.targetCustomer}. 
              High quality, ${formData.priceRange} level.`;
        };
        setPrompt(generatePrompt());
    }, [formData]);    // Xử lý thay đổi input
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };


    // Xử lý upload ảnh
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setFormData((prev) => ({ ...prev, customImages: files }));
    };

    // Generate ảnh
    const generateImages = async () => {
        if (!prompt.trim()) {
            setError('Please fill out the form to generate images');
            return;
        }

        setIsGenerating(true);
        setError('');

        try {
            const config = window.AI_CONFIG || {
                apiEndpoint: 'https://n8n.misencorp.com/webhook/gen-images',
                requestConfig: {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                },
            };

            // Hàm tạo value cho các trường auto
            const getAutoValue = (fieldName, currentValue) => {
                if (currentValue === 'auto') {
                    const config = autoConfig[fieldName];
                    const optionsString = config.options.slice(1).map(opt => `"${opt}"`).join(', ');
                    return `${config.autoInstruction} options (${optionsString})`;
                }
                return currentValue;
            };

            // Hàm tạo instructionKey dựa trên section được chọn
            const getInstructionKey = () => {
                const selectedSection = formData.sectionName;
                if (selectedSection && selectedSection !== 'auto') {
                    return sectionInstructionKeys[selectedSection];
                }
                // Nếu không chọn section cụ thể, tạo prompt mô tả
                return "Generate high-quality product images with professional styling, optimal composition, and clear visual hierarchy that effectively showcase the product's features and benefits";
            };

            // Tạo data object đơn giản theo yêu cầu - chỉ là key-value string
            const simpleData = {
                // Instruction Settings
                isUseInstruction: formData.isUseInstruction.toString(),

                // Product Info
                brandName: formData.brandName,
                productName: formData.productName,
                productCategory: formData.productCategory,
                productType: formData.productType,
                mainUSP: formData.mainUSP === 'manual_input' ? formData.mainUSPManual : getAutoValue('mainUSP', formData.mainUSP),
                productSize: getAutoValue('productSize', formData.productSize),
                targetCustomer: getAutoValue('targetCustomer', formData.targetCustomer),
                priceRange: getAutoValue('priceRange', formData.priceRange),

                // Section Configuration
                sectionName: getAutoValue('sectionName', formData.sectionName),
                sectionDescription: formData.sectionDescription,
                contentGoal: getAutoValue('contentGoal', formData.contentGoal),
                visualStyle: getAutoValue('visualStyle', formData.visualStyle),
                instructionKey: getInstructionKey(),

                // Image Settings
                imageSize: formData.imageSize,
                imageResolution: formData.imageResolution,
                maxImages: formData.maxImages,
            };

            // Xử lý maxImages: nếu auto thì dùng suggested count cho section, nếu không thì dùng giá trị được chọn
            const getImageCount = () => {
                if (formData.maxImages === 'auto') {
                    // Nếu section là auto, random 1-5
                    if (formData.sectionName === 'auto') {
                        return Math.floor(Math.random() * 5) + 1;
                    }
                    // Nếu có section cụ thể, dùng suggested count
                    return sectionImageCount[formData.sectionName] || 3;
                }
                // Nếu chọn số cụ thể
                return parseInt(formData.maxImages) || 1;
            };

            const imageCount = getImageCount();

            const response = await fetch(config.apiEndpoint, {
                ...config.requestConfig,
                body: JSON.stringify({
                    prompt: prompt,
                    data: simpleData,
                    imageCount: imageCount,
                    token: localStorage.getItem("shopify_misen_login"),
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate images');
            }

            const data = await response.json();

            // Xử lý response format mới với revised_prompt và url
            const processedImages = [];
            if (Array.isArray(data)) {
                data.forEach(item => {
                    if (item.url) {
                        processedImages.push({
                            url: item.url,
                            revised_prompt: item.revised_prompt || prompt
                        });
                    }
                });
            }

            setGeneratedImages(processedImages);

            // Lưu config sau khi generate thành công với URLs của ảnh
            if (processedImages.length > 0) {
                saveConfigRevision(formData, 'generate_success', processedImages);
            }

        } catch (err) {
            console.error('Error generating images:', err);
            setError('Failed to generate images. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    // Chọn ảnh
    const selectImage = (imageUrl) => {
        console.log('Selecting image:', { uniqueKey, imageUrl });

        // Dispatch event trước khi đóng modal
        const event = new CustomEvent('imageGenerated', {
            detail: { uniqueKey, imageUrl }
        });
        document.dispatchEvent(event);
        console.log('Event dispatched:', event.detail);

        // Gọi callback
        onSelectImage(imageUrl);

        // Delay một chút trước khi đóng modal để đảm bảo event được xử lý
        setTimeout(() => {
            onClose();
        }, 100);
    };

    // Lightbox functions
    const openLightbox = (index) => {
        setCurrentImageIndex(index);
        setLightboxOpen(true);
    };

    const closeLightbox = () => {
        setLightboxOpen(false);
    };

    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % generatedImages.length);
    };

    const prevImage = () => {
        setCurrentImageIndex((prev) => (prev - 1 + generatedImages.length) % generatedImages.length);
    };

    // Reference Images lightbox functions
    const openRefLightbox = (index) => {
        setCurrentRefImageIndex(index);
        setRefLightboxOpen(true);
    };

    const closeRefLightbox = () => {
        setRefLightboxOpen(false);
    };

    const nextRefImage = () => {
        setCurrentRefImageIndex((prev) => (prev + 1) % formData.customImages.length);
    };

    const prevRefImage = () => {
        setCurrentRefImageIndex((prev) => (prev - 1 + formData.customImages.length) % formData.customImages.length);
    };

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (lightboxOpen) {
                switch (e.key) {
                    case 'Escape':
                        closeLightbox();
                        break;
                    case 'ArrowLeft':
                        prevImage();
                        break;
                    case 'ArrowRight':
                        nextImage();
                        break;
                }
            } else if (refLightboxOpen) {
                switch (e.key) {
                    case 'Escape':
                        closeRefLightbox();
                        break;
                    case 'ArrowLeft':
                        prevRefImage();
                        break;
                    case 'ArrowRight':
                        nextRefImage();
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxOpen, refLightboxOpen]);

    return (
        <div className={`fixed inset-0 z-[9999] transition-all duration-300 ${isMinimized
            ? 'bg-transparent backdrop-blur-none flex items-end justify-center pb-4'
            : 'bg-black/60 backdrop-blur-sm flex items-center justify-center p-4'
            }`}>
            <div className={`bg-white shadow-2xl w-full overflow-hidden border border-gray-100 transition-all duration-300 ${isMinimized
                ? 'rounded-2xl max-h-[120px]'
                : 'rounded-3xl max-h-[95vh]'
                }`}>
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 px-8 py-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold mb-2">🎨 AI Image Generator</h2>
                            <p className="text-purple-100 opacity-90">Create stunning product images with advanced AI</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Revisions Button */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowRevisions(!showRevisions)}
                                    className="p-2 hover:bg-white/20 rounded-full transition-colors flex items-center gap-2"
                                    title="View saved configurations"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-sm">Revisions ({configRevisions.length})</span>
                                </button>
                            </div>
                            {/* Minimize Button */}
                            <button
                                onClick={() => setIsMinimized(!isMinimized)}
                                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                                title={isMinimized ? "Restore window" : "Minimize window"}
                            >
                                {isMinimized ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                    </svg>
                                )}
                            </button>
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                {!isMinimized && (
                    <div className="flex h-[calc(95vh-100px)]">
                        {/* Left Panel - Form */}
                        <div className="flex-1 p-8 overflow-y-auto bg-gray-50">
                            <div className="space-y-8">
                                {/* CORE PRODUCT INPUTS */}
                                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                                    <div className="flex items-center mb-6">
                                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-semibold text-gray-800">Core Product Information</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">Brand Name</label>
                                            <input
                                                type="text"
                                                name="brandName"
                                                value={formData.brandName}
                                                onChange={handleInputChange}
                                                placeholder="Enter brand name"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">Product Name</label>
                                            <input
                                                type="text"
                                                name="productName"
                                                value={formData.productName}
                                                onChange={handleInputChange}
                                                placeholder="Enter product name"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">Product Category</label>
                                            <input
                                                type="text"
                                                name="productCategory"
                                                value={formData.productCategory}
                                                onChange={handleInputChange}
                                                placeholder="e.g., Electronics, Fashion"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">Product Type</label>
                                            <input
                                                type="text"
                                                name="productType"
                                                value={formData.productType}
                                                onChange={handleInputChange}
                                                placeholder="e.g., Smartphone, T-shirt"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">Main USP</label>
                                            <select
                                                name="mainUSP"
                                                value={formData.mainUSP}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                                            >
                                                <option value="auto">Auto - Extract key differentiator from product details</option>
                                                <option value="manual_input">Manual Input</option>
                                            </select>
                                            {formData.mainUSP === 'manual_input' && (
                                                <input
                                                    type="text"
                                                    name="mainUSPManual"
                                                    value={formData.mainUSPManual}
                                                    onChange={handleInputChange}
                                                    placeholder="What makes your product unique?"
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all mt-2"
                                                />
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">Product Size</label>
                                            <select
                                                name="productSize"
                                                value={formData.productSize}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                                            >
                                                <option value="auto">Auto - {autoConfig.productSize.autoInstruction}</option>
                                                {autoConfig.productSize.options.slice(1).map(option => (
                                                    <option key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">Target Customer</label>
                                            <select
                                                name="targetCustomer"
                                                value={formData.targetCustomer}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                                            >
                                                <option value="auto">Auto - {autoConfig.targetCustomer.autoInstruction}</option>
                                                {autoConfig.targetCustomer.options.slice(1).map(option => (
                                                    <option key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1).replace('_', ' ')}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">Price Range</label>
                                            <select
                                                name="priceRange"
                                                value={formData.priceRange}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                                            >
                                                <option value="auto">Auto - {autoConfig.priceRange.autoInstruction}</option>
                                                {autoConfig.priceRange.options.slice(1).map(option => (
                                                    <option key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* REFERENCE IMAGES INPUT */}
                                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                                    <div className="flex items-center mb-6">
                                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold text-gray-800">Reference Images</h3>
                                            <p className="text-sm text-gray-600 mt-1">Upload reference images for style guidance</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="flex items-center justify-center w-full px-6 py-8 bg-green-50 border-2 border-dashed border-green-300 rounded-xl cursor-pointer hover:bg-green-100 transition-colors group">
                                            <div className="flex flex-col items-center">
                                                <svg className="w-12 h-12 text-green-500 mb-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                </svg>
                                                <span className="text-lg font-medium text-green-700 mb-2">Upload Reference Images</span>
                                                <span className="text-sm text-green-600">Click to browse or drag and drop</span>
                                                <span className="text-xs text-green-500 mt-1">Max 10 images • JPG, PNG, GIF</span>
                                            </div>
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                className="hidden"
                                            />
                                        </label>
                                        {formData.customImages && formData.customImages.length > 0 && (
                                            <div className="grid grid-cols-3 gap-3">
                                                {formData.customImages.map((file, index) => (
                                                    <div key={index} className="relative group">
                                                        <div
                                                            className="w-full h-24 cursor-pointer"
                                                            onClick={() => openRefLightbox(index)}
                                                        >
                                                            <img
                                                                src={URL.createObjectURL(file)}
                                                                alt={`Reference ${index + 1}`}
                                                                className="w-full h-full object-cover rounded-lg border border-gray-200 hover:scale-105 transition-transform"
                                                            />
                                                            {/* Preview overlay */}
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation(); // Ngăn event bubbling
                                                                const newFiles = formData.customImages.filter((_, i) => i !== index);
                                                                setFormData(prev => ({ ...prev, customImages: newFiles }));
                                                            }}
                                                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs hover:bg-red-600 z-10"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* IMAGE SETTINGS */}
                                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                                    <div className="flex items-center mb-6">
                                        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mr-4">
                                            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-semibold text-gray-800">Image Settings</h3>
                                    </div>
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">Image Size</label>
                                            <select
                                                name="imageSize"
                                                value={formData.imageSize}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                                            >
                                                <option value="square_hd">Square HD</option>
                                                <option value="portrait_4_3">Portrait 4:3</option>
                                                <option value="landscape_16_9">Landscape 16:9</option>
                                                <option value="standard">Standard</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">Image Resolution</label>
                                            <select
                                                name="imageResolution"
                                                value={formData.imageResolution}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                                            >
                                                <option value="1K">1K Resolution</option>
                                                <option value="2K">2K Resolution</option>
                                                <option value="4K">4K Resolution</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">Max Images</label>
                                            <select
                                                name="maxImages"
                                                value={formData.maxImages}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                                            >
                                                <option value="auto">Auto - Use section's default count</option>
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(num => (
                                                    <option key={num} value={num}>{num}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION CONFIGURATION */}
                                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mr-4">
                                                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                </svg>
                                            </div>
                                            <h3 className="text-xl font-semibold text-gray-800">Section Configuration</h3>
                                        </div>
                                        {/* Instruction Settings Toggle */}
                                        <div className="flex items-center gap-3">
                                            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                                <div className="relative">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.isUseInstruction}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, isUseInstruction: e.target.checked }))}
                                                        className="sr-only"
                                                    />
                                                    <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${formData.isUseInstruction ? 'bg-blue-600' : 'bg-gray-300'
                                                        }`}>
                                                        <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 mt-0.5 ${formData.isUseInstruction ? 'translate-x-5' : 'translate-x-0.5'
                                                            }`}></div>
                                                    </div>
                                                </div>
                                                <span className="text-sm font-medium">Use Instructions</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Single Section Fields */}
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">Section Type</label>
                                            <select
                                                name="sectionName"
                                                value={formData.sectionName}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                                            >
                                                <option value="auto">Auto - {autoConfig.sectionName.autoInstruction}</option>
                                                {autoConfig.sectionName.options.slice(1).map(option => (
                                                    <option key={option} value={option}>{option.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">Content Goal</label>
                                            <select
                                                name="contentGoal"
                                                value={formData.contentGoal}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                                            >
                                                <option value="auto">Auto - {autoConfig.contentGoal.autoInstruction}</option>
                                                {autoConfig.contentGoal.options.slice(1).map(option => (
                                                    <option key={option} value={option}>{option.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="col-span-2 space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">Section Description</label>
                                            <textarea
                                                name="sectionDescription"
                                                value={formData.sectionDescription}
                                                onChange={handleInputChange}
                                                placeholder="Describe specific requirements for this section..."
                                                rows={3}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">Visual Style</label>
                                            <select
                                                name="visualStyle"
                                                value={formData.visualStyle}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                                            >
                                                <option value="auto">Auto - {autoConfig.visualStyle.autoInstruction}</option>
                                                {autoConfig.visualStyle.options.slice(1).map(option => (
                                                    <option key={option} value={option}>{option.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="w-[40%] bg-white border-l border-gray-200 flex flex-col">
                            <div className="p-6 border-b border-gray-200">
                                <button
                                    onClick={generateImages}
                                    disabled={isGenerating || !prompt.trim()}
                                    className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 flex items-center justify-center gap-2 font-semibold"
                                >
                                    {isGenerating ? (
                                        <>
                                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            Generate Images
                                        </>
                                    )}
                                </button>

                                {error && (
                                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                        <div className="text-red-800 text-sm font-medium">Error</div>
                                        <div className="text-red-600 text-sm">{error}</div>
                                    </div>
                                )}
                            </div>

                            {/* Generated Images */}
                            <div className="flex-1 p-6 overflow-y-auto">
                                {generatedImages.length > 0 ? (
                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-800 mb-4">Generated Images ({generatedImages.length})</h4>
                                        <div className="space-y-6">
                                            {generatedImages.map((image, index) => (
                                                <div key={index} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                                                    <div className="relative group">
                                                        <img
                                                            src={image.url}
                                                            alt={`Generated image ${index + 1}`}
                                                            className="w-full h-48 object-cover cursor-pointer hover:scale-105 transition-transform"
                                                            onClick={() => openLightbox(index)}
                                                        />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300"></div>
                                                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openLightbox(index);
                                                                }}
                                                                className="px-3 py-2 bg-white/90 text-gray-900 rounded-lg hover:bg-white font-medium transition-colors text-sm flex items-center gap-1"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                                                </svg>
                                                                Preview
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    selectImage(image.url);
                                                                }}
                                                                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors text-sm flex items-center gap-1"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                                Select
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {image.revised_prompt && (
                                                        <div className="p-4 bg-gray-50 border-t border-gray-200">
                                                            <div className="flex items-start gap-2">
                                                                <svg className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                        <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <p className="text-center">Generated images will appear here</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Revisions Panel */}
                {showRevisions && (
                    <div className="absolute top-20 right-8 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-[10001] max-h-[80vh] overflow-hidden">
                        <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-4 py-3 text-white">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-lg text-[#fff]">Configuration Revisions</h3>
                                <div className="flex items-center gap-2">
                                    {configRevisions.length > 0 && (
                                        <button
                                            onClick={() => {
                                                if (window.confirm('Are you sure you want to clear all saved configurations? This cannot be undone.')) {
                                                    clearAllRevisions();
                                                }
                                            }}
                                            className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded transition-colors"
                                            title="Clear all revisions"
                                        >
                                            Clear All
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowRevisions(false)}
                                        className="p-1 hover:bg-white/20 rounded transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)]">
                            {configRevisions.length === 0 ? (
                                <div className="text-gray-500 text-center py-8">
                                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p>No saved configurations yet</p>
                                    <p className="text-sm mt-1">Configurations are saved automatically when you successfully generate images</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {configRevisions.map((revision) => (
                                        <div key={revision.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className={`w-2 h-2 rounded-full ${revision.action === 'generate_success' ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                                                        <span className="text-xs text-gray-500 uppercase tracking-wide">
                                                            {revision.action === 'generate_success' ? 'Generation Success' : revision.action.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-sm font-medium text-gray-900 truncate mb-1">
                                                        {revision.config.productName || 'Unnamed Product'}
                                                    </h4>
                                                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                                        {revision.description}
                                                    </p>
                                                    <div className="text-xs text-gray-500">
                                                        {new Date(revision.timestamp).toLocaleString('vi-VN')}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setConfirmRevert(revision)}
                                                    className="ml-3 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors flex items-center gap-1 flex-shrink-0"
                                                    title="Revert to this configuration"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                                    </svg>
                                                    Revert
                                                </button>
                                            </div>
                                            {/* Preview của config và generated images */}
                                            <div className="mt-2 pt-2 border-t border-gray-100">
                                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                                                    <div>
                                                        <span className="font-medium">Brand:</span> {revision.config.brandName || 'N/A'}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">Category:</span> {revision.config.productCategory || 'N/A'}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">Target:</span> {revision.config.targetCustomer || 'N/A'}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">Images:</span> {revision.generatedImages?.length || 0}
                                                    </div>
                                                </div>

                                                {/* Generated Images Preview */}
                                                {revision.generatedImages && revision.generatedImages.length > 0 && (
                                                    <div>
                                                        <div className="text-xs font-medium text-gray-700 mb-2">Generated Images:</div>
                                                        <div className="flex gap-1 flex-wrap">
                                                            {revision.generatedImages.slice(0, 4).map((image, imgIndex) => (
                                                                <div key={imgIndex} className="w-12 h-12 rounded border border-gray-200 overflow-hidden flex-shrink-0">
                                                                    <img
                                                                        src={image.url}
                                                                        alt={`Generated ${imgIndex + 1}`}
                                                                        className="w-full h-full object-cover hover:scale-110 transition-transform cursor-pointer"
                                                                        title={image.revised_prompt || 'Generated image'}
                                                                    />
                                                                </div>
                                                            ))}
                                                            {revision.generatedImages.length > 4 && (
                                                                <div className="w-12 h-12 rounded border border-gray-200 bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                                                                    +{revision.generatedImages.length - 4}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Minimized State */}
                {isMinimized && (
                    <div className="px-4 py-2">
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <span className="text-sm font-medium text-gray-800">AI Image Generator</span>
                            </div>
                            <p className="text-xs text-gray-600">Click restore to continue working</p>
                        </div>
                    </div>
                )}

                {/* Confirmation Modal for Revert */}
                {confirmRevert && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-[10002]">
                        <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-2xl">
                            <div className="text-center">
                                <div className="w-12 h-12 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Revert</h3>
                                <p className="text-gray-600 mb-4">
                                    Are you sure you want to revert to this configuration? This will replace your current settings with:
                                </p>
                                <div className="bg-gray-50 rounded-lg p-3 mb-4 text-left text-sm">
                                    <div className="font-medium text-gray-900">{confirmRevert.config.productName || 'Unnamed Product'}</div>
                                    <div className="text-gray-600 mt-1">{confirmRevert.description}</div>
                                </div>
                                <div className="flex gap-3 justify-center">
                                    <button
                                        onClick={() => setConfirmRevert(null)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => revertToRevision(confirmRevert.id)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Yes, Revert
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Lightbox */}
                {lightboxOpen && generatedImages.length > 0 && (
                    <div className="fixed inset-0 bg-black/95 z-[10000] flex items-center justify-center p-4">
                        {/* Close Button */}
                        <button
                            onClick={closeLightbox}
                            className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full transition-colors z-10"
                        >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Navigation Buttons */}
                        {generatedImages.length > 1 && (
                            <>
                                <button
                                    onClick={prevImage}
                                    className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 text-white hover:bg-white/10 rounded-full transition-colors z-10"
                                >
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <button
                                    onClick={nextImage}
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 text-white hover:bg-white/10 rounded-full transition-colors z-10"
                                >
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </>
                        )}

                        {/* Image Container */}
                        <div className="max-w-5xl max-h-full flex flex-col items-center">
                            <img
                                src={generatedImages[currentImageIndex]?.url}
                                alt={`Generated image ${currentImageIndex + 1}`}
                                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
                            />

                            {/* Image Info */}
                            <div className="mt-6 max-w-2xl text-center">
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                    <div className="flex items-center justify-center gap-4 mb-4">
                                        <span className="text-white/70 text-sm">
                                            {currentImageIndex + 1} of {generatedImages.length}
                                        </span>
                                        <button
                                            onClick={() => selectImage(generatedImages[currentImageIndex]?.url)}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors text-sm flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Select This Image
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Thumbnail Strip */}
                        {generatedImages.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                                <div className="flex gap-2 p-2 bg-white/10 backdrop-blur-sm rounded-lg">
                                    {generatedImages.map((image, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setCurrentImageIndex(index)}
                                            className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${index === currentImageIndex
                                                ? 'border-blue-400 ring-2 ring-blue-400/50'
                                                : 'border-white/30 hover:border-white/60'
                                                }`}
                                        >
                                            <img
                                                src={image.url}
                                                alt={`Thumbnail ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Click outside to close */}
                        <div
                            className="absolute inset-0 -z-10"
                            onClick={closeLightbox}
                        ></div>
                    </div>
                )}

                {/* Reference Images Lightbox */}
                {refLightboxOpen && formData.customImages.length > 0 && (
                    <div className="fixed inset-0 bg-black/95 z-[10001] flex items-center justify-center p-4">
                        {/* Close Button */}
                        <button
                            onClick={closeRefLightbox}
                            className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full transition-colors z-10"
                        >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Navigation Buttons */}
                        {formData.customImages.length > 1 && (
                            <>
                                <button
                                    onClick={prevRefImage}
                                    className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 text-white hover:bg-white/10 rounded-full transition-colors z-10"
                                >
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <button
                                    onClick={nextRefImage}
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 text-white hover:bg-white/10 rounded-full transition-colors z-10"
                                >
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </>
                        )}

                        {/* Image Container */}
                        <div className="max-w-5xl max-h-full flex flex-col items-center">
                            <img
                                src={URL.createObjectURL(formData.customImages[currentRefImageIndex])}
                                alt={`Reference image ${currentRefImageIndex + 1}`}
                                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
                            />

                            {/* Image Info */}
                            <div className="mt-6 max-w-2xl text-center">
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                    <div className="flex items-center justify-center gap-4 mb-4">
                                        <span className="text-white/70 text-sm">
                                            Reference Image {currentRefImageIndex + 1} of {formData.customImages.length}
                                        </span>
                                        <span className="text-white/70 text-sm">
                                            {formData.customImages[currentRefImageIndex]?.name}
                                        </span>
                                    </div>
                                    <div className="text-white/60 text-xs">
                                        Click outside or press ESC to close
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Thumbnail Strip */}
                        {formData.customImages.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                                <div className="flex gap-2 p-2 bg-white/10 backdrop-blur-sm rounded-lg">
                                    {formData.customImages.map((file, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setCurrentRefImageIndex(index)}
                                            className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${index === currentRefImageIndex
                                                ? 'border-blue-400 ring-2 ring-blue-400/50'
                                                : 'border-white/30 hover:border-white/60'
                                                }`}
                                        >
                                            <img
                                                src={URL.createObjectURL(file)}
                                                alt={`Thumbnail ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Click outside to close */}
                        <div
                            className="absolute inset-0 -z-10"
                            onClick={closeRefLightbox}
                        ></div>
                    </div>
                )}
            </div>
        </div>
    );
};

function ImageEditModal({ metaKeys, currentValues, element, onSave, onClose }) {
    const { useState } = React;
    const [values, setValues] = useState(currentValues);

    const handleInputChange = (uniqueKey, value) => {
        setValues(prev => ({
            ...prev,
            [uniqueKey]: value
        }));
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const base64Url = await fileToBase64(file);
            metaKeys.forEach((metaKey, index) => {
                if (!metaKey.trim()) return;
                const uniqueKey = metaKeys.length > 1 ? `${metaKey}_${index}` : metaKey;
                if (metaKey.includes('image') && !metaKey.includes('alt')) {
                    setValues(prev => ({
                        ...prev,
                        [uniqueKey]: base64Url
                    }));
                }
            });
        }
    };

    React.useEffect(() => {
        const handleImageGenerated = (event) => {
            const { uniqueKey: eventUniqueKey, imageUrl } = event.detail;

            setValues(prev => {
                const newValues = {
                    ...prev,
                    [eventUniqueKey]: imageUrl
                };
                return newValues;
            });
            onSave({
                ...values,
                [eventUniqueKey]: imageUrl
            })
        };

        document.addEventListener('imageGenerated', handleImageGenerated);
        return () => {
            document.removeEventListener('imageGenerated', handleImageGenerated);
        };
    }, []);

    const handleSave = () => {
        onSave(values);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-100">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-8 py-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold mb-2">🖼️ Edit Image & Alt Text</h2>
                            <p className="text-blue-100 opacity-90">
                                {metaKeys.length === 1
                                    ? 'Customize your image and add descriptive alt text'
                                    : 'This element has multiple attributes - edit each field below'
                                }
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto max-h-[calc(90vh-120px)]">
                    <div className="space-y-8">
                        {metaKeys.map((metaKey, index) => {
                            if (!metaKey.trim()) return null;
                            const uniqueKey = metaKeys.length > 1 ? `${metaKey}_${index}` : metaKey;
                            const displayName = metaKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                            // Single meta field layout
                            if (metaKeys.length === 1) {
                                return (
                                    <div key={uniqueKey} className="space-y-8">
                                        {/* Image Section */}
                                        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                                            <div className="flex items-center mb-6">
                                                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <h3 className="text-xl font-semibold text-gray-800">{displayName}</h3>
                                            </div>

                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                                {/* Image Preview */}
                                                <div className="space-y-4">
                                                    <label className="block text-sm font-medium text-gray-700">Image Preview</label>
                                                    <div className="relative">
                                                        {values[uniqueKey] ? (
                                                            <img
                                                                src={values[uniqueKey]}
                                                                alt="Preview"
                                                                className="w-full h-64 object-cover rounded-xl border-2 border-gray-200 shadow-sm"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-64 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
                                                                <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                </svg>
                                                                <p className="text-gray-500">No image selected</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Image Controls */}
                                                <div className="space-y-6">
                                                    <div className="space-y-3">
                                                        <label className="block text-sm font-medium text-gray-700">Image URL</label>
                                                        <input
                                                            type="text"
                                                            value={values[uniqueKey] || ''}
                                                            onChange={(e) => handleInputChange(uniqueKey, e.target.value)}
                                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                            placeholder="Enter image URL or use buttons below..."
                                                        />
                                                    </div>

                                                    <div className="space-y-3">
                                                        <label className="block text-sm font-medium text-gray-700">Upload Options</label>
                                                        <div className="grid grid-cols-1 gap-3">
                                                            <label className="flex items-center justify-center px-4 py-3 bg-blue-500 text-white rounded-xl cursor-pointer hover:bg-blue-600 transition-colors group">
                                                                <svg className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                                </svg>
                                                                Upload from Computer
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={handleImageUpload}
                                                                    className="hidden"
                                                                />
                                                            </label>
                                                            <button
                                                                type="button"
                                                                onClick={() => openImageGeneratorModal(uniqueKey)}
                                                                className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 group"
                                                            >
                                                                <svg className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                                </svg>
                                                                AI Generate Image
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Alt Text Section */}
                                        {metaKeys.join(' ').includes('alt') && (
                                            <div className="bg-green-50 rounded-2xl p-6 border border-green-200">
                                                <div className="flex items-center mb-6">
                                                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                                                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-semibold text-gray-800">Alt Text</h3>
                                                        <p className="text-sm text-green-600 mt-1">Improves accessibility and SEO</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="block text-sm font-medium text-gray-700">Alternative Text Description</label>
                                                    <input
                                                        type="text"
                                                        value={values[`${uniqueKey}_alt`] || ''}
                                                        onChange={(e) => handleInputChange(`${uniqueKey}_alt`, e.target.value)}
                                                        className="w-full px-4 py-3 border border-green-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                                        placeholder="Describe the image for screen readers and SEO..."
                                                    />
                                                    <p className="text-xs text-gray-500">
                                                        💡 Tip: Describe what's in the image, not just "image" or "photo"
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                            // Multiple meta fields layout
                            else if (metaKey.includes('image') && !metaKey.includes('alt')) {
                                return (
                                    <div key={uniqueKey} className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                                        <div className="flex items-center mb-6">
                                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <h4 className="text-lg font-semibold text-gray-800">{displayName}</h4>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                {values[uniqueKey] && (
                                                    <img
                                                        src={values[uniqueKey]}
                                                        alt="Preview"
                                                        className="w-full h-48 object-cover rounded-lg border border-gray-200 mb-3"
                                                    />
                                                )}
                                            </div>
                                            <div className="space-y-4">
                                                <input
                                                    type="text"
                                                    value={values[uniqueKey] || ''}
                                                    onChange={(e) => handleInputChange(uniqueKey, e.target.value)}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                    placeholder="Enter image URL..."
                                                />
                                                <div className="flex gap-2">
                                                    <label className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors text-center text-sm">
                                                        Upload
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={handleImageUpload}
                                                            className="hidden"
                                                        />
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => openImageGeneratorModal(uniqueKey)}
                                                        className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm"
                                                    >
                                                        AI Generate
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            } else if (metaKey.includes('alt')) {
                                return (
                                    <div key={uniqueKey} className="bg-green-50 rounded-2xl p-6 border border-green-200">
                                        <div className="flex items-center mb-4">
                                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <h4 className="text-lg font-semibold text-gray-800">{displayName}</h4>
                                        </div>
                                        <input
                                            type="text"
                                            value={values[uniqueKey] || ''}
                                            onChange={(e) => handleInputChange(uniqueKey, e.target.value)}
                                            className="w-full px-4 py-3 border border-green-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                            placeholder="Describe the image for accessibility..."
                                        />
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-8 py-6 border-t border-gray-200">
                    <div className="flex justify-end gap-4">
                        <button
                            className="px-6 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 transition-colors font-medium"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 font-medium flex items-center gap-2"
                            onClick={handleSave}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TextEditModal({ metaKeys, currentValues, element, onSave, onClose }) {
    const { useState } = React;
    const [values, setValues] = useState(currentValues);

    const handleInputChange = (uniqueKey, value) => {
        setValues(prev => ({
            ...prev,
            [uniqueKey]: value
        }));
    };

    const handleSave = () => {
        onSave(values);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
            <div className="bg-white rounded-2xl p-6 w-[600px] max-h-[80vh] overflow-y-auto shadow-xl">
                <h2 className="text-xl font-semibold mb-4">✏️ Edit Multiple Meta Fields</h2>
                <p className="text-gray-600 mb-6">
                    This element has multiple meta attributes. Edit each field below:
                </p>

                <div className="space-y-4">
                    {metaKeys.map((metaKey, index) => {
                        if (!metaKey.trim()) return null;
                        const uniqueKey = metaKeys.length > 1 ? `${metaKey}_${index}` : metaKey;
                        const displayName = metaKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                        return (
                            <div key={uniqueKey} className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    {displayName}
                                </label>
                                <input
                                    type="text"
                                    value={values[uniqueKey] || ''}
                                    onChange={(e) => handleInputChange(uniqueKey, e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder={`Enter ${displayName.toLowerCase()}...`}
                                />
                            </div>
                        );
                    })}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        onClick={handleSave}
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

function GalleryModal({ onClose, onSave, images }) {
    const { useState } = React;
    const { DragDropContext, Droppable, Draggable } = window.ReactBeautifulDnd;
    const [list, setList] = useState(images || []);
    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        for (const file of files) {
            const base64 = await fileToBase64(file);
            setList(prev => [
                ...prev,
                {
                    url: base64,
                    type: "image"
                }
            ]);
        }
    };

    const reorder = (arr, startIndex, endIndex) => {
        const result = Array.from(arr);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return result;
    };

    const onDragEnd = (result) => {
        if (!result.destination) return;
        setList(reorder(list, result.source.index, result.destination.index));
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
            <div className="bg-white rounded-2xl p-6 w-[500px] max-h-[80vh] overflow-y-auto shadow-xl overflow-x-hidden">
                <h2 className="text-xl font-semibold mb-4">📷 Gallery Editor</h2>

                <label className="block mb-4">
                    <span className="sr-only">Upload images</span>
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-full file:border-0
                       file:text-sm file:font-semibold
                       file:bg-blue-50 file:text-blue-700
                       hover:file:bg-blue-100 cursor-pointer"
                    />
                </label>

                <DragDropContext onDragEnd={onDragEnd} style={{
                    width: '100%',
                }}>
                    <Droppable droppableId="gallery" direction="horizontal">
                        {(provided) => (
                            <div
                                className="grid grid-cols-3 gap-3"
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                            >
                                {list.map((src, i) => (
                                    <Draggable key={i} draggableId={`img-${i}`} index={i}>
                                        {(provided) => (
                                            <div
                                                className="relative group rounded-lg overflow-hidden border"
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                            >
                                                <img
                                                    src={src.url}
                                                    className="w-full h-28 object-cover"
                                                />
                                                <button
                                                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-80 hover:opacity-100"
                                                    onClick={() => setList(list.filter((_, idx) => idx !== i))}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                        onClick={() => {
                            onSave(list);
                            onClose();
                        }}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}

