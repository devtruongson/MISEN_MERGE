setTimeout(() => {
    if (window.location.pathname.includes("/products/")) {
        const katChingBundlePar = document.querySelector("kaching-bundle");
        if (!katChingBundlePar) return;
        const id = katChingBundlePar.getAttribute("product-id");
        if (!id) return;
        if (id != productData.id) return;
        const katChingBundleBlock = katChingBundlePar.querySelector("kaching-bundles-block");

        if (!katChingBundleBlock) return;
        const config = katChingBundleBlock.getAttribute("deal-block");
        if (!config) return;
        const configJson = JSON.parse(config);
        const dealBars = configJson.dealBars;
        if (!dealBars || dealBars.length === 0) return;
        katChingBundlePar.style.display = "none";
        DealBars(dealBars);
    }
}, 2000);

function formatMoney(cents, format = Shopify.currency.active, isTruncate = false) {
    if (typeof cents === "string") {
        cents = cents.replace(".", "");
    }
    const noDecimalCurrencies = ["VND", "JPY", "KRW", "IDR"];

    if (noDecimalCurrencies.includes(Shopify.currency.active)) {
        cents = cents / 100;
    }

    let value = "";
    const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    const formatString = format || this.money_format;

    function defaultOption(opt, def) {
        return typeof opt === "undefined" ? def : opt;
    }

    function formatWithDelimiters(number, precision, thousands, decimal) {
        precision = defaultOption(precision, 2);
        thousands = defaultOption(thousands, ",");
        decimal = defaultOption(decimal, ".");

        if (isNaN(number) || number == null) return "0";

        number = formatNumberTruncate(number / 100.0, precision);

        const parts = number.split(".");
        const dollars = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
        const cents = parts[1] ? decimal + parts[1] : "";

        return dollars + cents;
    }

    const match = formatString.match(placeholderRegex);
    if (!match) return cents + " " + Shopify.currency.active;

    switch (match[1]) {
        case "amount":
            value = formatWithDelimiters(cents, 2);
            break;
        case "amount_no_decimals":
            value = formatWithDelimiters(cents, 0);
            break;
        case "amount_with_comma_separator":
            value = formatWithDelimiters(cents, 2, ".", ",");
            break;
        case "amount_no_decimals_with_comma_separator":
            value = formatWithDelimiters(cents, 0, ".", ",");
            break;
        default:
            value = formatWithDelimiters(cents, 2);
    }

    return formatString.replace(placeholderRegex, value) + " " + Shopify.currency.active;
}

function formatNumberTruncate(number, precision) {
    const factor = Math.pow(10, precision);
    const truncated = Math.floor(number * factor) / factor;
    return truncated.toFixed(precision);
}


function DealBars(dealBars) {
    const listProductRoot = document.querySelectorAll(".root-product-render");
    if (!listProductRoot || listProductRoot.length === 0) return;
    listProductRoot.forEach((productRoot, index) => {
        HandleDealBarItem(productRoot, index, dealBars)
    });

}

function HandleDealBarItem(productRoot, index, dealBars) {
    const handleCalcPrice = (valueDiscount, typeDiscount, price) => {
        if (typeDiscount === "default") {
            return price;
        }

        if (typeDiscount === "percentage" && parseInt(valueDiscount) > 0) {
            return price - (price * valueDiscount / 100);
        }

        return price;
    }

    const priceOriginal = productRoot.querySelector(".price-original");
    const priceDiscount = productRoot.querySelector(".price-discount");
    const priceDiscountText = productRoot.querySelector(".price-discount-text");
    const addToCartButton = productRoot.querySelector(".add-to-cart-button");
    const priceDiscountTextWp = productRoot.querySelector(".price-discount-text-wp");
    const variantSelectWrapper = productRoot.querySelector(".variant-select-wrapper");
    const imageRender = productRoot.querySelector("img");

    if (!priceOriginal || !priceDiscount || !priceDiscountText || !addToCartButton || !priceDiscountTextWp || !variantSelectWrapper || !imageRender) return;
    const dealBar = dealBars[index];
    if (!dealBar) return;

    const handleShowPrice = (price) => {
        if (dealBar.discountType !== "default") {
            priceOriginal.textContent = formatMoney(price * dealBar.quantity);
            priceDiscount.textContent = formatMoney(handleCalcPrice(dealBar.discountValue, dealBar.discountType, price) * dealBar.quantity);
            priceDiscountText.textContent = `Save ${formatMoney(price * dealBar.quantity - handleCalcPrice(dealBar.discountValue, dealBar.discountType, price) * dealBar.quantity)} (${dealBar.discountValue}%)`;
        } else {
            priceDiscountTextWp.style.display = "none";
            priceOriginal.style.display = "none";
            priceDiscount.textContent = formatMoney(price * dealBar.quantity);
            priceDiscountText.style.display = "none";
        }
    }

    HandleVariantSelect(variantSelectWrapper, imageRender, handleShowPrice, addToCartButton, dealBar)

}

function HandleVariantSelect(variantSelectWrapper, imageRender, handleShowPrice, addToCartButton, dealBar) {
    const variantSelect = ReactDOM.createRoot(variantSelectWrapper);
    variantSelect.render(<VariantSelect imageRender={imageRender} handleShowPrice={handleShowPrice} addToCartButton={addToCartButton} dealBar={dealBar} />);
}

function VariantSelect({ imageRender, handleShowPrice, addToCartButton, dealBar }) {
    const [variantActive, setVariantActive] = React.useState(null);
    React.useEffect(() => {
        setVariantActive(productData?.selected_or_first_available_variant?.id);
    }, [productData]);

    React.useEffect(() => {
        if (variantActive) {
            imageRender.src =
                productData?.variants?.find((variant) => variant.id == variantActive)?.image ||
                productData.image;

            handleShowPrice(
                productData?.variants?.find((variant) => variant.id == variantActive)?.price ||
                productData.price
            );
        } else {
            handleShowPrice(productData.price);
        }

        if (!variantActive) return;

        const handleClick = async (lineItems) => {
            return await fetch(`https://${Shopify.shop}/api/${"2025-07"}/graphql.json`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Shopify-Storefront-Access-Token": "07e41e6b62b1dad042bc9872ebfbaca5"
                },
                body: JSON.stringify({
                    query: `mutation cartCreate($input: CartInput) {
                        cartCreate(input: $input) { 
                            cart { 
                                id 
                                checkoutUrl
                                attributes {
                                    key
                                    value
                                }
                            }
                            userErrors { 
                                field 
                                message 
                                } 
                            } 
                        }`,
                    variables: {
                        input: {
                            lines: [
                                {
                                    quantity: dealBar.quantity,
                                    merchandiseId: `gid://shopify/ProductVariant/${variantActive}`,
                                    attributes: [
                                        {
                                            key: "__kaching_bundles",
                                            value: JSON.stringify({
                                                deal: dealBar.id,
                                                main: true
                                            })
                                        }
                                    ]
                                }
                            ],
                        }
                    }
                })
            })
                .then((res) => res.json())
                .then(({ data }) => {
                    if (data.cartCreate && data.cartCreate.cart) {
                        window.location.href = data.cartCreate.cart.checkoutUrl;
                        return;
                    }
                })
                .catch(error => {
                    console.log(error)
                });
        }

        addToCartButton.addEventListener("click", handleClick);

        return () => {
            addToCartButton.removeEventListener("click", handleClick);
        };
    }, [variantActive, productData, dealBar]);

    return <>
        <select onChange={(e) => setVariantActive(e.target.value)} value={variantActive} class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
            {productData?.variants?.map((variant) => (
                <option value={variant.id} selected={variant.id === variantActive}>{variant.title}</option>
            ))}
        </select>
    </>
}