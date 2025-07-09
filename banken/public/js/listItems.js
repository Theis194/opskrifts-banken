document.getElementById('shopping-items').addEventListener('change', function(e) {
    // Check if the clicked element is a checkbox
    if (e.target.classList.contains('checkbox')) {
        // Find the closest parent with class 'shopping-item'
        const item = e.target.closest('.shopping-item');
        if (!item) return; // Exit if no parent found (safety check)

        // Find the item name element (use correct class)
        const itemName = item.querySelector('.item-name');
        if (!itemName) {
            console.error("Could not find .item-name element in:", item);
            return;
        }

        // Toggle line-through class based on checkbox state
        itemName.classList.toggle('line-through', e.target.checked);
    }
});

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.shopping-item .checkbox:checked').forEach(checkbox => {
        const item = checkbox.closest('.shopping-item');
        const itemName = item?.querySelector('.item-name');
        if (itemName) itemName.classList.add('line-through');
    });
});