function injectScript(src, { integrity, crossorigin, referrerpolicy, defer = false, type } = {}) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        if (integrity) script.integrity = integrity;
        if (crossorigin) script.crossOrigin = crossorigin;
        if (referrerpolicy) script.referrerPolicy = referrerpolicy;
        if (defer) script.defer = true;
        if (type) script.type = type;

        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

async function injectBabelScript(url) {
    const script = document.createElement("script");
    script.type = "text/babel";
    script.defer = true;
    script.src = url;
    document.head.appendChild(script);
}

// (async () => {
//     try {
//         await injectScript("https://unpkg.com/@babel/standalone/babel.min.js");
//         await Promise.all([
//             await injectScript("https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js", {
//                 integrity: "sha512-WFN04846sdKMIP5LKNphMaWzU7YpMyCU245etK3g/2ARYbPK9Ub18eG+ljU96qKRCWh+quCY7yefSmlkQw1ANQ==",
//                 crossorigin: "anonymous",
//                 referrerpolicy: "no-referrer",
//             }), await injectScript("https://unpkg.com/react@18/umd/react.production.min.js"),
//             await injectScript("https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"),
//             await injectScript("https://unpkg.com/react-beautiful-dnd@13.1.1/dist/react-beautiful-dnd.min.js"),
//             await injectScript("https://cdn.jsdelivr.net/npm/sweetalert2@11.23.0/dist/sweetalert2.all.min.js")
//         ])
//         console.log("✅ Tất cả script đã được load và 2 file cuối đã thực thi bằng Babel!");
//     } catch (err) {
//         console.error("❌ Lỗi khi load script:", err);
//     }
// })();

// setTimeout(async () => {
//     console.log("⏳ Bắt đầu thực thi 2 file cuối bằng Babel...");
//     await injectBabelScript("https://shopify-dev-misen.fstack.io.vn/shopify.edit.js");
//     await injectBabelScript("https://shopify-dev-misen.fstack.io.vn/shopify.kaching.js");
// }, 10000)

// // Thêm CSS SweetAlert
// const swalertCss = document.createElement("link");
// swalertCss.rel = "stylesheet";
// swalertCss.href = "https://cdn.jsdelivr.net/npm/sweetalert2@11.23.0/dist/sweetalert2.min.css";
// document.head.insertBefore(swalertCss, document.head.firstChild);
