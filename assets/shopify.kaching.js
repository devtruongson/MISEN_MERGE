setTimeout(() => {
    const containerList = document.querySelectorAll('.kaching-bundles__bar-container');
    containerList.forEach(container => {
        const listFreeGift = container.querySelectorAll('.kaching-bundles__free-gift');
        listFreeGift.forEach((gift, index) => {
            if (index > 0) {
                gift.style.setProperty("display", "none", "important");
            } else {
                gift.style.setProperty("display", "flex", "important");
            }
        });
    });
}, 1000);

setTimeout(() => {
    if (window.location.pathname.includes("/products/")) {
        const katChingBundlePar = document.querySelector("kaching-bundle");
        if (!katChingBundlePar) return;
        const id = katChingBundlePar.getAttribute("product-id");
        if (!id || !window.productData) return;
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
    const formatter = new Intl.NumberFormat(format, {
        style: 'currency',
        currency: format,
        trailingZeroDisplay: 'stripIfInteger'
    });

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
    if (!match) return formatter.format(cents);

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
    const regularPrice = document.querySelector(".regular-price");
    const savePriceText = document.querySelector(".save-price-text");
    const todayPrice = document.querySelector(".today-price");
    const imageRender = productRoot.querySelector("img");

    if (!priceOriginal || !priceDiscount || !priceDiscountText || !addToCartButton || !priceDiscountTextWp || !variantSelectWrapper || !imageRender) return;
    const dealBar = dealBars[index];
    if (!dealBar) return;

    const handleShowPrice = (price) => {
        if (dealBar.discountType !== "default") {
            priceOriginal.textContent = formatMoney(price * dealBar.quantity);
            regularPrice.textContent = formatMoney(price * dealBar.quantity);
            todayPrice.textContent = formatMoney(handleCalcPrice(dealBar.discountValue, dealBar.discountType, price) * dealBar.quantity);
            savePriceText.textContent = `Save ${formatMoney(price * dealBar.quantity - handleCalcPrice(dealBar.discountValue, dealBar.discountType, price) * dealBar.quantity)} (${dealBar.discountValue}%)`;
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
    const [openDropdown, setOpenDropdown] = React.useState(null); // Changed to single value

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
            const lines = [
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
            ];

            if (dealBar.freeGifts && dealBar.freeGifts.length > 0) {
                dealBar.freeGifts.forEach(gift => {
                    if (gift.variantGID) {
                        lines.push({
                            quantity: gift.quantity || 1,
                            merchandiseId: gift.variantGID,
                            attributes: [
                                {
                                    key: "__kaching_bundles",
                                    value: JSON.stringify({
                                        id: gift.id,
                                        deal: dealBar.id,
                                        gift: gift.id,
                                    })
                                }
                            ]
                        });
                    }
                });
            }

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
                            lines: lines,
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

    const toggleDropdown = (optionIndex) => {
        // If clicking the same dropdown, close it. Otherwise, open the new one
        setOpenDropdown(prev => prev === optionIndex ? null : optionIndex);
    };

    const handleOptionSelect = (optionIndex, selectedValue) => {
        // Get current variant's options
        const currentVariant = productData.variants.find(variant => variant.id === variantActive);
        const currentOptions = currentVariant?.title?.split(" / ") || [];

        // Update the specific option
        const newOptions = [...currentOptions];
        newOptions[optionIndex] = selectedValue;

        // Find variant that matches the new option combination
        const newVariant = productData.variants.find(variant => {
            const variantOptions = variant.title.split(" / ");
            return newOptions.every((option, idx) => variantOptions[idx] === option);
        });

        if (newVariant) {
            setVariantActive(newVariant.id);
        }

        // Close dropdown after selection
        setOpenDropdown(null);
    };

    const getCurrentOptionValue = (optionIndex) => {
        const currentVariant = productData.variants.find(variant => variant.id === variantActive);
        return currentVariant?.title?.split(" / ")[optionIndex] || '';
    };

    // Only show options if there are multiple variants and options have more than 1 value
    const shouldShowOptions = productData.options.length > 0;

    if (!shouldShowOptions) {
        return null;
    }

    return (
        <div className="space-y-2 mb-3">
            {productData.options.map((option, optionIndex) => {
                // Skip option if it only has 1 value
                if (option.values.length <= 1) {
                    return null;
                }

                const isOpen = openDropdown === optionIndex;

                return (
                    <div key={optionIndex} className="relative">
                        <button
                            onClick={() => toggleDropdown(optionIndex)}
                            className={`w-full flex items-center justify-between px-4 py-3 bg-white border-[2px] rounded-xl text-left hover:bg-slate-100 transition-colors ${isOpen ? 'border-slate-800' : ' border-slate-200'}`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-black font-medium text-sm">
                                    {getCurrentOptionValue(optionIndex)}
                                </span>
                            </div>
                            <svg
                                className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {isOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-xl shadow-xl z-10 animate-slide-down">
                                {option.values.map((value, valueIndex) => (
                                    <button
                                        key={valueIndex}
                                        onClick={() => handleOptionSelect(optionIndex, value)}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl transition-colors"
                                    >
                                        <span className="text-black">{value}</span>
                                        {getCurrentOptionValue(optionIndex) === value && (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-green-500 ml-auto" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M20 6 9 17l-5-5"></path>
                                            </svg>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}