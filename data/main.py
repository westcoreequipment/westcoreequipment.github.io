import os
from PIL import Image

def convert_png_to_jpg(folder_path):
    # Iterate through all files in the specified folder
    for filename in os.listdir(folder_path):
        if filename.lower().endswith(".png"):
            # Construct full file paths
            png_path = os.path.join(folder_path, filename)
            jpg_path = os.path.join(folder_path, os.path.splitext(filename)[0] + ".jpg")
            
            # Open the image
            with Image.open(png_path) as img:
                # Convert to RGB mode to remove any transparency
                rgb_img = img.convert("RGB")
                # Save as JPG
                rgb_img.save(jpg_path, "JPEG", quality=90)
                print(f"Converted: {filename} -> {os.path.basename(jpg_path)}")

# Update this path to your folder
convert_png_to_jpg('./')
