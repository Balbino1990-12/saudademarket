from PIL import Image, ImageDraw, ImageFont
import os

os.makedirs(r'd:\Upwork project\portugalstore.fr\public\images', exist_ok=True)

names =['hero','charcutaria','queijos','vinhos','conservas','doces','mercaria','azeite','pasteis','bacalhau','chourico','vinhos_licores','cabazes','logo']
for name in names:
    img = Image.new('RGB',(800,400),(200,200,200))
    d=ImageDraw.Draw(img)
    try:
        f=ImageFont.truetype('arial.ttf',40)
    except:
        f=ImageFont.load_default()
    d.text((10,10),name,(0,0,0),font=f)
    img.save(f"d:/Upwork project/portugalstore.fr/public/images/{name}.jpg")
print('done')