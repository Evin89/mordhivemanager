from pathlib import Path
import json
from PIL import Image, ImageStat, ImageDraw
ROOT = Path(__file__).resolve().parents[1]
BASE = Path(r'C:\Users\Evin Wijninga\Documents\Codex\2026-11-09\i-x20\work\connector-private\smoke-project\.codex-generated-images')
SHEETS = {
'imperial-guard-remnants': ('1ef5b9cf-5b3f-4534-964d-f455412442e5','dd3db674-2b67-4680-805a-90dcfc57a774'),
'ordo-hereticus-retainers': ('76093ebe-a139-4bd7-af46-ef5252d05c5d','bfe5c9b4-d213-4537-adc6-8ca10f86e99d'),
'order-of-the-black-sepulchre': ('109082aa-ca0a-40ac-acd4-ca0d0e16fe04','8668407a-12a3-40d7-8205-f4ac07747fa8'),
'forsaken-astartes': ('4d700357-5e16-403e-8592-6b2ea69be30c','51e1dc57-f72e-42eb-93b0-81d9754cc683'),
'squat-strip-miners': ('c4c28bc0-05a9-4238-b18c-546edee0cf2c','a1eacf9c-576a-4d61-bc81-40911bc91974'),
 'the-pox-cult': ('d703c30f-b5c8-4908-bba4-b0d43195655f','0f598a7d-b19e-49d5-b72d-ac6a8a813be7'),
'lost-and-the-damned': ('db03f9af-df86-4a70-b71e-24aaca83363f','9ed2334d-83de-4580-a0e4-d428d79d7fdb'),
'ork-mob': ('a0a5c2a5-51d3-4573-800b-3c9f46cfd8b7','917a85ad-7640-4a61-8e21-34274c877b82'),
'cult-of-the-four-armed-emperor': ('146a49c4-369f-4389-8b3d-f69557b162ca','7ff8cd6d-b5d6-4348-a738-1b7059785517'),
'dark-eldar-coterie': ('8b670f77-7501-494e-af11-bec2c7914c44','a97003f9-f4e2-4bdf-91c3-ce8f248c7e76'),
'eldar-wayward-host': ('f5cf53d7-5ccc-488a-a0bd-fe721e7c98d0','4f8a4a3b-9d0b-4076-8ffc-1a414ed024eb'),
'tau-pathfinder-cadre': ('c23338e6-438a-407f-a5ef-174274ae4727','2c5d1f35-6983-4913-808b-f46040c73f79')}

def gutter(im, axis):
    n = im.size[axis]
    def score(i):
        line = im.crop((i,0,i+1,im.height) if axis == 0 else (0,i,im.width,i+1))
        st = ImageStat.Stat(line)
        return sum(st.mean) + sum(st.stddev)*2
    mid = min(range(int(n*.43),int(n*.57)), key=score)
    lo = hi = mid
    while lo > n*.4 and score(lo-1) < score(mid)+12: lo -= 1
    while hi < n*.6 and score(hi+1) < score(mid)+12: hi += 1
    return lo, hi

if __name__ == '__main__':
    contact = Image.new('RGB',(4*160,12*180),'#26211c')
    draw = ImageDraw.Draw(contact)
    for row,(slug,(folder,job)) in enumerate(SHEETS.items()):
        filename = 'exec-'+job+'.png'
        path = BASE / folder / filename
        if not path.exists(): path = next((Path.home()/'.codex/generated_images').rglob(filename))
        im = Image.open(path).convert('RGB')
        x0,x1 = gutter(im,0); y0,y1 = gutter(im,1)
        print(slug,im.size,'gutter',x0,x1,y0,y1)
        out = ROOT/'public/img/portraits'/slug; out.mkdir(parents=True,exist_ok=True)
        for i,(l,t,r,b) in enumerate([(0,0,x0,y0),(x1+1,0,im.width,y0),(0,y1+1,x0,im.height),(x1+1,y1+1,im.width,im.height)]):
            cell=im.crop((l+5,t+5,r-5,b-5)); side=min(cell.size)
            left=(cell.width-side)//2; top=(cell.height-side)//2
            cell=cell.crop((left,top,left+side,top+side)).resize((512,512),Image.Resampling.LANCZOS)
            cell.save(out/f'{i}.webp',quality=80)
            contact.paste(cell.resize((160,160)),(i*160,row*180))
        draw.text((0,row*180+160),slug,fill='white')
    contact.save(ROOT/'scripts/portrait-contact-sheet.jpg')
