#!/usr/bin/env python3
"""
Script per generare le icone del plugin in varie dimensioni.
Esegue questo script per generare le icone mancanti.
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, output_path):
    """Crea un'icona quadrata con sfondo blu e una "D" bianca"""
    # Crea immagine trasparente
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Sfondo circolare blu
    draw.ellipse([(0, 0), (size, size)], fill=(66, 133, 244, 255))
    
    # Lettera "D" bianca
    try:
        # Prova a usare un font disponibile
        font = ImageFont.truetype("arial.ttf", size // 2)
    except:
        # Fallback a font di default
        font = ImageFont.load_default()
    
    # Calcola posizione per centrare la lettera
    # Metodo compatibile con Pillow >= 10.0.0
    text_bbox = draw.textbbox((0, 0), "D", font=font)
    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]
    x = (size - text_width) / 2
    y = (size - text_height) / 2
    
    draw.text((x, y), "D", fill=(255, 255, 255, 255), font=font)
    
    # Salva l'immagine
    img.save(output_path, 'PNG')
    print(f"Icona {size}x{size} creata: {output_path}")

def main():
    icon_dir = os.path.dirname(os.path.abspath(__file__))
    sizes = [16, 32, 48, 128]
    
    for size in sizes:
        output_path = os.path.join(icon_dir, f'icon{size}.png')
        create_icon(size, output_path)

if __name__ == '__main__':
    main()
