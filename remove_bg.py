from PIL import Image

def remove_background(input_path, output_path):
    img = Image.open(input_path).convert('RGBA')
    # Crop
    img = img.crop((0, 250, 1024, 750))
    
    data = img.getdata()
    new_data = []
    
    for item in data:
        r, g, b, a = item
        # If brightness > 210, it's the beige background, make transparent
        # If brightness < 120, it's the dark text, keep fully opaque
        # Between 120 and 210, blend alpha for smooth edges
        brightness = (r + g + b) / 3.0
        
        if brightness > 215:
            new_data.append((r, g, b, 0))
        elif brightness > 120:
            alpha = int(255 * (215 - brightness) / (215 - 120))
            new_data.append((r, g, b, alpha))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(output_path, "PNG")

in_file = r'C:\Users\Admin\.gemini\antigravity\brain\ad287e61-358b-4869-ae47-1293cceed5b9\media__1776427119330.png'
out1 = r'c:\Users\Admin\Desktop\Gom\gom-web\public\logo.png'
out2 = r'c:\Users\Admin\Desktop\Gom\gom_app\assets\logo.png'

remove_background(in_file, out1)
remove_background(in_file, out2)
print("Background removed successfully!")
