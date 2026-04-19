from PIL import Image

# Read the image
img = Image.open('C:\\Users\\Admin\\.gemini\\antigravity\\brain\\ad287e61-358b-4869-ae47-1293cceed5b9\\media__1776427119330.png').convert('RGBA')

data = img.getdata()
new_data = []

# Define a color threshold to decide what is "background"
# The image in the prompt has a very light beige background
# Let's check for RGB values near 245-255.
threshold = 240

for item in data:
    # item is (R, G, B, A)
    if item[0] > threshold and item[1] > threshold and item[2] > threshold:
        # Make background transparent
        new_data.append((255, 255, 255, 0))
    else:
        new_data.append(item)

img.putdata(new_data)
bbox = img.getbbox()
print('Bounding box:', bbox)

if bbox:
    # Add a little padding around the bounding box
    padding = 10
    crop_box = (
        max(0, bbox[0] - padding),
        max(0, bbox[1] - padding),
        min(img.width, bbox[2] + padding),
        min(img.height, bbox[3] + padding)
    )
    img_cropped = img.crop(crop_box)
    
    # Save the transparent, cropped logo
    out1 = r'c:\Users\Admin\Desktop\Gom\gom-web\public\logo.png'
    out2 = r'c:\Users\Admin\Desktop\Gom\gom_app\assets\logo.png'
    img_cropped.save(out1, "PNG")
    img_cropped.save(out2, "PNG")
    print("Saved successfully!")
else:
    print("No bounding box found.")
