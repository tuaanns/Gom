from PIL import Image

img = Image.open('C:\\Users\\Admin\\.gemini\\antigravity\\brain\\ad287e61-358b-4869-ae47-1293cceed5b9\\media__1776427119330.png').convert('RGBA')

# Crop out the bottom text which is roughly at the bottom 15% 
# Also crop top 20% since the logo is in the middle
img = img.crop((0, 250, 1024, 750))

bg_color = (232, 226, 220)
tolerance = 15

data = img.getdata()
new_data = []

for item in data:
    r, g, b, a = item
    if abs(r - bg_color[0]) < tolerance and abs(g - bg_color[1]) < tolerance and abs(b - bg_color[2]) < tolerance:
        new_data.append((255, 255, 255, 0))
    else:
        new_data.append(item)

# We use the internal `_getdata` alternative or just `putdata`
img.putdata(new_data)
bbox = img.getbbox()

if bbox:
    padding = 10
    crop_box = (
        max(0, bbox[0] - padding),
        max(0, bbox[1] - padding),
        min(img.width, bbox[2] + padding),
        min(img.height, bbox[3] + padding)
    )
    img = img.crop(crop_box)

img.save(r'c:\Users\Admin\Desktop\Gom\gom-web\public\logo.png', "PNG")
img.save(r'c:\Users\Admin\Desktop\Gom\gom_app\assets\logo.png', "PNG")
print('Saved new cropped logo! Size:', img.size)
