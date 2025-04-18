function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file.type.startsWith('image/')) return;
  
    const reader = new FileReader();
    reader.onload = function(evt) {
      const base64 = evt.target.result;
      document.getElementById('previewImage').src = base64;
      document.getElementById('hiddenImageInput').value = base64;
    };
    reader.readAsDataURL(file);
  }
  