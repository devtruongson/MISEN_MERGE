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
    reader.readAsDataURL(file); // đọc file thành base64 data URL
    return new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
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
                const event = new CustomEvent('imageGenerated', {
                    detail: { uniqueKey, imageUrl }
                });
                document.dispatchEvent(event);
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

// function ImageGeneratorModal({ uniqueKey, onSelectImage, onClose }) {
//     const { useState } = React;
//     const [prompt, setPrompt] = useState('');
//     const [isGenerating, setIsGenerating] = useState(false);
//     const [generatedImages, setGeneratedImages] = useState([]);
//     const [error, setError] = useState('');

//     const generateImages = async () => {
//         if (!prompt.trim()) {
//             setError('Please enter a prompt');
//             return;
//         }

//         setIsGenerating(true);
//         setError('');

//         try {
//             // Sử dụng config từ ai-config.js
//             const config = window.AI_CONFIG || {
//                 apiEndpoint: 'https://api.openai.com/v1/images/generations',
//                 requestConfig: {
//                     method: 'POST',
//                     headers: {
//                         'Content-Type': 'application/json',
//                         'Authorization': 'Bearer YOUR_API_KEY_HERE'
//                     }
//                 },
//                 generationParams: {
//                     n: 4,
//                     size: '1024x1024'
//                 }
//             };

//             const requestBody = {
//                 prompt: prompt,
//                 ...config.generationParams
//             };

//             const response = await fetch(config.apiEndpoint, {
//                 ...config.requestConfig,
//                 body: JSON.stringify(requestBody)
//             });

//             if (!response.ok) {
//                 throw new Error('Failed to generate images');
//             }

//             const data = await response.json();
//             setGeneratedImages(data.data || []);
//         } catch (err) {
//             console.error('Error generating images:', err);
//             setError('Failed to generate images. Please try again.');
//         } finally {
//             setIsGenerating(false);
//         }
//     };

//     const selectImage = (imageUrl) => {
//         onSelectImage(imageUrl);
//         onClose();
//     };

//     const config = window.AI_CONFIG || {};
//     const uiConfig = config.ui || {};

//     return (
//         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
//             <div className="bg-white rounded-2xl p-6 w-[800px] max-h-[90vh] overflow-y-auto shadow-xl">
//                 <h2 className="text-xl font-semibold mb-4">
//                     {uiConfig.modalTitle || '🎨 AI Image Generator'}
//                 </h2>
//                 <p className="text-gray-600 mb-6">
//                     {uiConfig.modalDescription || 'Enter a prompt to generate images using AI'}
//                 </p>

//                 <div className="space-y-4">
//                     <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-2">
//                             Prompt
//                         </label>
//                         <textarea
//                             value={prompt}
//                             onChange={(e) => setPrompt(e.target.value)}
//                             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
//                             placeholder={uiConfig.placeholder || 'Describe the image you want to generate...'}
//                             rows={4}
//                         />
//                     </div>

//                     <div className="flex gap-3">
//                         <button
//                             onClick={generateImages}
//                             disabled={isGenerating || !prompt.trim()}
//                             className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
//                         >
//                             {isGenerating ? (uiConfig.generatingText || 'Generating...') : (uiConfig.generateButtonText || 'Generate Images')}
//                         </button>
//                         <button
//                             onClick={onClose}
//                             className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
//                         >
//                             Cancel
//                         </button>
//                     </div>

//                     {error && (
//                         <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
//                             {error}
//                         </div>
//                     )}

//                     {generatedImages.length > 0 && (
//                         <div>
//                             <h3 className="text-lg font-medium mb-3">Generated Images</h3>
//                             <div className="grid grid-cols-2 gap-4">
//                                 {generatedImages.map((image, index) => (
//                                     <div key={index} className="relative group">
//                                         <img
//                                             src={image.url}
//                                             alt={`Generated image ${index + 1}`}
//                                             className="w-full h-48 object-cover rounded border cursor-pointer hover:opacity-90"
//                                             onClick={() => selectImage(image.url)}
//                                         />
//                                         <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
//                                             <button
//                                                 onClick={() => selectImage(image.url)}
//                                                 className="px-4 py-2 bg-white text-black rounded-md hover:bg-gray-100"
//                                             >
//                                                 {uiConfig.selectButtonText || 'Select This Image'}
//                                             </button>
//                                         </div>
//                                     </div>
//                                 ))}
//                             </div>
//                         </div>
//                     )}
//                 </div>
//             </div>
//         </div>
//     );
// }



const ImageGeneratorModal = ({ uniqueKey, onSelectImage, onClose }) => {
    const { useState, useEffect } = React;

    const [formData, setFormData] = useState({
        brandName: productData?.brandName || '',
        productName: productData?.title || '',
        productCategory: productData?.productCategory || '',
        productType: productData?.productType || '',
        mainUSP: productData?.mainUSP || '',
        productSize: productData?.productSize || '',
        targetCustomer: productData?.targetCustomer || '',
        priceRange: productData?.priceRange || '',
        referenceImages: productData?.availableReferenceImages || [],
        customImages: [],
        sections: [
            { sectionName: '', description: '', contentGoal: '', imageQuantity: '', visualStyle: '' },
        ],
    });

    // State cho modal generate
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImages, setGeneratedImages] = useState([]);
    const [error, setError] = useState('');

    // Cập nhật prompt dựa trên formData khi thay đổi
    useEffect(() => {
        const generatePrompt = () => {
            const section = formData.sections[0]; // Lấy section đầu tiên để demo
            return `Generate image in ${section.visualStyle || 'Lifestyle/Natural'} style for ${formData.productName} (${formData.mainUSP}). 
              Section: ${section.sectionName || 'Hero Image'}. Description: ${section.description || 'Show the product in use'}. 
              Goal: ${section.contentGoal || 'Create Desire'}. Target: ${formData.targetCustomer || 'Everyone'}. 
              Include references like ${formData.referenceImages.join(', ') || 'none'}. 
              High quality, ${formData.priceRange || 'Premium'} level.`;
        };
        setPrompt(generatePrompt());
    }, [formData]);

    // Xử lý thay đổi input
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // Xử lý checkbox
    const handleCheckboxChange = (e) => {
        const { value, checked } = e.target;
        setFormData((prev) => {
            const updatedImages = checked
                ? [...prev.referenceImages, value]
                : prev.referenceImages.filter((img) => img !== value);
            return { ...prev, referenceImages: updatedImages };
        });
    };

    // Xử lý upload ảnh
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setFormData((prev) => ({ ...prev, customImages: files }));
    };

    // Xử lý thay đổi section
    const handleSectionChange = (index, e) => {
        const { name, value } = e.target;
        const updatedSections = [...formData.sections];
        updatedSections[index][name] = value;
        setFormData((prev) => ({ ...prev, sections: updatedSections }));
    };

    // Thêm section mới
    const addSection = () => {
        setFormData((prev) => ({
            ...prev,
            sections: [...prev.sections, { sectionName: '', description: '', contentGoal: '', imageQuantity: '', visualStyle: '' }],
        }));
    };

    // Xóa section (chỉ cho phép xóa nếu có hơn 1 section)
    const removeSection = (index) => {
        if (formData.sections.length > 1) {
            const updatedSections = formData.sections.filter((_, i) => i !== index);
            setFormData((prev) => ({ ...prev, sections: updatedSections }));
        }
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

            const requestBody = {
                prompt: prompt,
                ...config.generationParams,
            };

            const dataSend = [];

            for (let i = 0; i < parseInt(formData.sections[0]?.imageQuantity || "1"); i++) {
                dataSend.push(requestBody);
            }

            const response = await fetch(config.apiEndpoint, {
                ...config.requestConfig,
                body: JSON.stringify(dataSend),
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
        } catch (err) {
            console.error('Error generating images:', err);
            setError('Failed to generate images. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    // Chọn ảnh
    const selectImage = (imageUrl) => {
        onSelectImage(imageUrl);
        onClose();
    };

    console.log("check re-render")

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-h-[95vh] overflow-hidden border border-gray-100">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 px-8 py-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold mb-2">🎨 AI Image Generator</h2>
                            <p className="text-purple-100 opacity-90">Create stunning product images with advanced AI</p>
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
                                        <input
                                            type="text"
                                            name="mainUSP"
                                            value={formData.mainUSP}
                                            onChange={handleInputChange}
                                            placeholder="What makes your product unique?"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">Product Size</label>
                                        <select
                                            name="productSize"
                                            value={formData.productSize}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                                        >
                                            <option value="">Select Size</option>
                                            <option value="Tiny">Tiny</option>
                                            <option value="Small">Small</option>
                                            <option value="Medium">Medium</option>
                                            <option value="Large">Large</option>
                                            <option value="Oversized">Oversized</option>
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
                                            <option value="">Select Target</option>
                                            <option value="Everyone">Everyone</option>
                                            <option value="Men">Men</option>
                                            <option value="Women">Women</option>
                                            <option value="Professionals">Professionals</option>
                                            <option value="Seniors">Seniors</option>
                                            <option value="Pet Owners">Pet Owners</option>
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
                                            <option value="">Select Range</option>
                                            <option value="Budget">Budget</option>
                                            <option value="Mid">Mid</option>
                                            <option value="Premium">Premium</option>
                                            <option value="Luxury">Luxury</option>
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
                                    <h3 className="text-xl font-semibold text-gray-800">Reference Images</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        'Product on white background', 'Product packaging/box', 'Product lifestyle shot', 'Product in use',
                                        'Product details/close-up', 'Product dimensions/size chart', 'Brand logo', 'Competitor product',
                                        'Old/current product (for comparison)', 'Customer photos/UGC', 'Certification/awards', 'Influencer with product',
                                        'Before/after results', 'Infographic/data', 'Manual/instruction pages', '[Upload custom images]'
                                    ].map((option) => (
                                        <div key={option} className="flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors">
                                            <input
                                                type="checkbox"
                                                value={option}
                                                checked={formData.referenceImages.includes(option)}
                                                onChange={handleCheckboxChange}
                                                className="mr-3 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                            <label className="text-md text-gray-700 cursor-pointer flex-1">{option}</label>
                                            {option === '[Upload custom images]' && formData.referenceImages.includes(option) && (
                                                <input
                                                    type="file"
                                                    multiple
                                                    onChange={handleFileChange}
                                                    className="ml-3 text-xs border border-gray-300 rounded px-2 py-1"
                                                />
                                            )}
                                        </div>
                                    ))}
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
                                    <button
                                        onClick={addSection}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        Add Section
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {formData.sections.map((section, index) => (
                                        <div key={index} className="border border-gray-200 rounded-xl p-6 bg-gray-50 relative">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-lg font-medium text-gray-800">Section #{index + 1}</h4>
                                                {formData.sections.length > 1 && (
                                                    <button
                                                        onClick={() => removeSection(index)}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors group"
                                                        title="Delete this section"
                                                    >
                                                        <svg className="w-5 h-5 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="block text-sm font-medium text-gray-700">Section Type</label>
                                                    <select
                                                        name="sectionName"
                                                        value={section.sectionName}
                                                        onChange={(e) => handleSectionChange(index, e)}
                                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                                                    >
                                                        <option value="">Choose Section</option>
                                                        <option value="Hero Image">Hero Image</option>
                                                        <option value="Homepage Banner">Homepage Banner</option>
                                                        <option value="Product Gallery">Product Gallery</option>
                                                        <option value="Features & Benefits">Features & Benefits</option>
                                                        <option value="How It Works">How It Works</option>
                                                        <option value="How to Use">How to Use</option>
                                                        <option value="Before & After">Before & After</option>
                                                        <option value="Customer Reviews/Testimonials">Customer Reviews/Testimonials</option>
                                                        <option value="Problem & Solution">Problem & Solution</option>
                                                        <option value="Scientific/Research">Scientific/Research</option>
                                                        <option value="Comparison">Comparison</option>
                                                        <option value="Warranty/Guarantee">Warranty/Guarantee</option>
                                                        <option value="[Custom Section]">[Custom Section]</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="block text-sm font-medium text-gray-700">Content Goal</label>
                                                    <select
                                                        name="contentGoal"
                                                        value={section.contentGoal}
                                                        onChange={(e) => handleSectionChange(index, e)}
                                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                                                    >
                                                        <option value="">Select Goal</option>
                                                        <option value="Build Trust">Build Trust</option>
                                                        <option value="Show Value">Show Value</option>
                                                        <option value="Explain Function">Explain Function</option>
                                                        <option value="Prove Results">Prove Results</option>
                                                        <option value="Create Desire">Create Desire</option>
                                                        <option value="Remove Doubts">Remove Doubts</option>
                                                        <option value="Drive Action">Drive Action</option>
                                                    </select>
                                                </div>
                                                <div className="col-span-2 space-y-2">
                                                    <label className="block text-sm font-medium text-gray-700">Description</label>
                                                    <textarea
                                                        name="description"
                                                        value={section.description}
                                                        onChange={(e) => handleSectionChange(index, e)}
                                                        placeholder="Describe what you want to show in this section..."
                                                        rows={3}
                                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="block text-sm font-medium text-gray-700">Image Quantity</label>
                                                    <select
                                                        name="imageQuantity"
                                                        value={section.imageQuantity}
                                                        onChange={(e) => handleSectionChange(index, e)}
                                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                                                    >
                                                        <option value="">Select Quantity</option>
                                                        <option value="1 image">1 image</option>
                                                        <option value="2-3 images">2-3 images</option>
                                                        <option value="4-6 images">4-6 images</option>
                                                        <option value="7-10 images">7-10 images</option>
                                                        <option value="10+ images">10+ images</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="block text-sm font-medium text-gray-700">Visual Style</label>
                                                    <select
                                                        name="visualStyle"
                                                        value={section.visualStyle}
                                                        onChange={(e) => handleSectionChange(index, e)}
                                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                                                    >
                                                        <option value="">Select Style</option>
                                                        <option value="Professional/Studio">Professional/Studio</option>
                                                        <option value="Lifestyle/Natural">Lifestyle/Natural</option>
                                                        <option value="Technical/Diagram">Technical/Diagram</option>
                                                        <option value="UGC/Authentic">UGC/Authentic</option>
                                                        <option value="3D/CGI">3D/CGI</option>
                                                        <option value="Mixed">Mixed</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
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
                                                        onClick={() => selectImage(image.url)}
                                                    />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                        <button
                                                            onClick={() => selectImage(image.url)}
                                                            className="px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 font-medium transition-colors"
                                                        >
                                                            Select This Image
                                                        </button>
                                                    </div>
                                                </div>
                                                {image.revised_prompt && (
                                                    <div className="p-4 bg-gray-50 border-t border-gray-200">
                                                        <div className="flex items-start gap-2">
                                                            <svg className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <div className="flex-1">
                                                                <h5 className="text-xs font-semibold text-gray-700 mb-1">Revised Prompt:</h5>
                                                                <p className="text-xs text-gray-600 leading-relaxed">{image.revised_prompt}</p>
                                                            </div>
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
            const { uniqueKey, imageUrl } = event.detail;
            setValues(prev => ({
                ...prev,
                [uniqueKey]: imageUrl
            }));
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

