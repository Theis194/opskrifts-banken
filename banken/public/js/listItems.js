document
    .getElementById("shopping-items")
    .addEventListener("change", function (e) {
        // Check if the clicked element is a checkbox
        if (e.target.classList.contains("checkbox")) {
            // Find the closest parent with class 'shopping-item'
            const item = e.target.closest(".shopping-item");
            if (!item) return; // Exit if no parent found (safety check)

            // Find the item name element (use correct class)
            const itemName = item.querySelector(".item-name");
            if (!itemName) {
                console.error("Could not find .item-name element in:", item);
                return;
            }

            // Toggle line-through class based on checkbox state
            itemName.classList.toggle("line-through", e.target.checked);
        }
    });

document.addEventListener("DOMContentLoaded", function () {
    document
        .querySelectorAll(".shopping-item .checkbox:checked")
        .forEach((checkbox) => {
            const item = checkbox.closest(".shopping-item");
            const itemName = item?.querySelector(".item-name");
            if (itemName) itemName.classList.add("line-through");
        });
});

document.addEventListener("alpine:init", () => {
    Alpine.data("shoppingListAutocomplete", () => ({
        query: "",
        quantity: 1,
        unit: "",
        matches: [],
        open: false,
        activeIndex: -1,
        currentUsername: window.currentUsername,
        listId: new URLSearchParams(window.location.search).get("id"),
        removedItems: [],

        init() {
            // Initialize remove handlers for existing items
            this.initializeRemoveHandlers();

            document.addEventListener("click", (e) => {
                if (!this.$el.contains(e.target)) {
                    this.open = false;
                }
            });
        },

        // Reusable function to initialize remove handlers
        initializeRemoveHandlers() {
            document
                .querySelectorAll(".shopping-item .remove-item")
                .forEach((button) => {
                    // Skip if already has listener
                    if (button._removeHandler) return;

                    const item = button.closest(".shopping-item");
                    button._removeHandler = () => this.handleItemRemoval(item);
                    button.addEventListener("click", button._removeHandler);
                });
        },

        // Centralized removal logic
        handleItemRemoval(item) {
            const itemName = item.querySelector(".item-name").textContent;
            const addedBy = item.querySelector(".added-by").textContent;
            const [quantity, unit] = item
                .querySelector(".text-sm")
                .textContent.split(" ");

            this.removeItem(this.listId, itemName, quantity, unit, addedBy)
                .then((response) => {
                    if (response.ok) {
                        item.remove();
                        this.updateItemCount();
                    } else {
                        console.error("Failed to remove item:", response);
                        alert("Failed to remove item. Please try again.");
                    }
                })
                .catch((error) => {
                    console.error("Error removing item:", error);
                    alert("An error occurred while removing the item.");
                });
        },

        filterItems() {
            if (!this.query) {
                this.matches = [];
                return;
            }

            this.matches = window.itemNames
                .filter((item) =>
                    item.toLowerCase().includes(this.query.toLowerCase())
                )
                .slice(0, 8);

            this.activeIndex = -1;
            this.open = true;
        },

        moveDown() {
            if (this.activeIndex < this.matches.length - 1) {
                this.activeIndex++;
            }
        },

        moveUp() {
            if (this.activeIndex > 0) {
                this.activeIndex--;
            }
        },

        selectItem() {
            if (this.activeIndex >= 0 && this.matches[this.activeIndex]) {
                this.query = this.matches[this.activeIndex];
            }
            this.open = false;
        },

        selectItemWithClick(index) {
            this.query = this.matches[index];
            this.open = false;
        },

        addItemToList() {
            if (!this.query) return;

            this.addItem(
                this.listId,
                this.query,
                this.quantity,
                this.unit,
                this.currentUsername
            )
                .then((response) => {
                    if (response.ok) {
                        // Create a new item element
                        const newItem = document.createElement("div");
                        newItem.className =
                            "shopping-item px-6 py-4 flex items-center hover:bg-gray-50";
                        newItem.innerHTML = `
                        <div class="flex items-center mr-4 ">
                        <input type="checkbox" class="checkbox checkbox-primary"/>
                        </div>
                        <div class="flex-grow">
                        <div class="item-name font-medium text-gray-800">${this.query}</div>
                        <div class="text-sm text-gray-500">${this.quantity} ${this.unit}</div>
                        </div>
                        <div class="text-sm text-gray-500 ml-4">
                        Added by <span class="font-medium added-by">${this.currentUsername}</span>
                        </div>
                        <button class="ml-4 text-gray-400 hover:text-gray-600 remove-item">
                            <i class="fas fa-trash"></i>
                        </button>
                        </div>
                    `;

                        // Add to the items list
                        document
                            .getElementById("shopping-items")
                            .appendChild(newItem);

                        // Initialize remove handler for this specific item
                        const removeButton =
                            newItem.querySelector(".remove-item");
                        removeButton._removeHandler = () =>
                            this.handleItemRemoval(newItem);
                        removeButton.addEventListener(
                            "click",
                            removeButton._removeHandler
                        );

                        // Update item count
                        this.updateItemCount();
                    } else {
                        console.error("Failed to add item:", response);
                        alert("Failed to add item. Please try again.");
                    }
                })
                .catch((error) => {
                    console.error("Error adding item:", error);
                    alert("An error occurred while adding the item.");
                })
                .finally(() => {
                    // Clear the input and reset loading state
                    this.query = "";
                    this.quantity = 1;
                    this.unit = "";
                });
        },

        async removeItem(listId, itemName, quantity, unit, addedBy) {
            this.removedItems.push({
                listId,
                itemName,
                quantity,
                unit,
                addedBy,
            });
            console.log(
                `removing item from shopping list with id ${listId}: ${itemName} ${quantity} ${unit}, added by ${addedBy}`
            );
            console.log(this.removedItems);
        },

        async addItem(listId, itemName, quantity, unit, addedBy) {
            console.log(
                `adding item from shopping list with id ${listId}: ${itemName} ${quantity} ${unit}, added by ${addedBy}`
            );
        },

        updateItemCount() {
            const count = document.querySelectorAll(".shopping-item").length;
            document
                .getElementById("item-count")
                .querySelector("span").textContent = `${count} items`;
        },
    }));
});

// Initialize handlers for existing items when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
    const app = document.querySelector('[x-data="shoppingListAutocomplete"]');
    if (app) {
        app.__x.$data.initializeRemoveHandlers();
    }
});
