document.addEventListener("DOMContentLoaded", function () {
  // Add new ingredient row
  let ingredientCount = 1;
  document.getElementById("add-ingredient").addEventListener(
    "click",
    function () {
      const newRow = document.createElement("div");
      newRow.className = "ingredient-row grid grid-cols-12 gap-4 items-end";
      newRow.innerHTML = `
          <div class="col-span-5 form-control">
            <label class="label">
              <span class="label-text">Name*</span>
            </label>
        
            <!-- combobox -->
            <div
              x-data="{
                query: '',
                open: false,
                get matches() {
                  if (!this.query) return [];
                  return window.KNOWN_INGREDIENTS
                    .filter(i => i.toLowerCase().includes(this.query.toLowerCase()))
                    .slice(0, 8);
                }
              }"
              class="relative w-full"
            >
              <input
                x-model="query"
                @focus="open = true"
                @input="open = true"
                @keydown.escape="open = false"
                type="text"
                name="ingredients[${ingredientCount}][name]"
                placeholder="e.g. chickpeas"
                class="input input-bordered w-full"
                autocomplete="off"
                required
              >
              <ul
                x-show="open && matches.length"
                @click.outside="open = false"
                class="menu dropdown-content p-2 shadow bg-base-100 rounded-box absolute w-full max-h-60 overflow-y-auto z-20"
                x-transition
              >
                <template x-for="item in matches" :key="item">
                  <li><a @click="query = item; open = false" x-text="item"></a></li>
                </template>
              </ul>
            </div>
          </div>
        
          <div class="col-span-2 form-control">
            <input type="number" step="0.1" name="ingredients[${ingredientCount}][quantity]" class="input input-bordered">
          </div>
          <div class="col-span-2 form-control">
            <input type="text" name="ingredients[${ingredientCount}][unit]" class="input input-bordered">
          </div>
          <div class="col-span-2 form-control">
            <input type="text" name="ingredients[${ingredientCount}][notes]" class="input input-bordered">
          </div>
          <div class="col-span-1">
            <button type="button" class="btn btn-error btn-sm remove-ingredient">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        `;
      document.getElementById("ingredients-list").appendChild(newRow);
      ingredientCount++;

      // Enable remove buttons for all but first row
      document.querySelectorAll(".remove-ingredient").forEach((btn) => {
        btn.disabled = false;
      });
    },
  );

  // Add new instruction step
  let instructionCount = 1;
  document.getElementById("add-instruction").addEventListener(
    "click",
    function () {
      const newStep = document.createElement("div");
      newStep.className = "instruction-step";
      newStep.innerHTML = `
        <div class="form-control">
          <label class="label">
            <span class="label-text">Step ${instructionCount + 1}*</span>
          </label>
          <div class="flex gap-2">
            <textarea name="instructions[${instructionCount}][text]" class="textarea textarea-bordered flex-1" required></textarea>
            <button type="button" class="btn btn-error btn-sm remove-instruction">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `;
      document.getElementById("instructions-list").appendChild(newStep);
      instructionCount++;

      // Enable remove buttons for all but first step
      document.querySelectorAll(".remove-instruction").forEach((btn) => {
        btn.disabled = false;
      });
    },
  );

  // Remove ingredient row
  document.addEventListener("click", function (e) {
    if (e.target.classList.contains("remove-ingredient")) {
      e.target.closest(".ingredient-row").remove();
    }
    if (e.target.classList.contains("remove-instruction")) {
      e.target.closest(".instruction-step").remove();
    }
  });

  // Category and Tag selection
  const categorySelect = document.getElementById("category-select");
  const tagSelect = document.getElementById("tag-select");

  categorySelect.addEventListener("change", function () {
    if (this.value) {
      const option = this.options[this.selectedIndex];
      const categoryId = this.value;
      const categoryName = option.text;

      const badge = document.createElement("span");
      badge.className = `badge badge-ghost fas ${
        window.KNOWN_CATEGORIES[categoryName]
      } flex items-center gap-2 px-3 py-2 rounded-lg mr-2 mb-2`;
      badge.innerHTML = `
          ${categoryName}
          <input type="hidden" name="categories[]" value="${categoryId}">
          <button type="button" class="ml-1" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
          </button>
        `;

      document.getElementById("categories-container").appendChild(badge);
      this.value = "";
    }
  });

  tagSelect.addEventListener("change", function () {
    if (this.value) {
      const option = this.options[this.selectedIndex];
      const tagId = this.value;
      const tagName = option.text;
      const tagColor = window.KNOWN_TAGS[tagName] || "#6b7280";

      const badge = document.createElement("span");
      badge.className = `flex items-center gap-2 px-3 rounded-lg`;
      badge.style.backgroundColor = tagColor;
      badge.style.color = "white";
      badge.innerHTML = `
          ${tagName}
          <input type="hidden" name="tags[]" value="${tagId}">
          <button type="button" class="ml-1" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
          </button>
        `;

      document.getElementById("tags-container").appendChild(badge);
      this.value = "";
    }
  });

  // Form submission
  document.getElementById("recipe-form").addEventListener(
    "submit",
    function (e) {
      e.preventDefault();
      // Here you would handle the form submission, likely via fetch() to your backend
      console.log("Form submitted", new FormData(this));
      alert("Recipe saved successfully!");
    },
  );
});
