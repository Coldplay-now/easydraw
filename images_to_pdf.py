#!/usr/bin/env python3
"""
图片转PDF工具
将指定目录中的图片文件转换为PDF，第一张图片作为封面
"""

import os
import sys
from PIL import Image
import argparse
from pathlib import Path

def images_to_pdf(input_dir, output_path=None):
    """
    将目录中的图片转换为PDF
    
    Args:
        input_dir (str): 包含图片的目录路径
        output_path (str): 输出PDF文件路径，如果为None则自动生成
    
    Returns:
        str: 生成的PDF文件路径
    """
    
    # 检查输入目录是否存在
    if not os.path.exists(input_dir):
        raise FileNotFoundError(f"目录不存在: {input_dir}")
    
    # 获取所有图片文件
    image_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff'}
    image_files = []
    
    for file in os.listdir(input_dir):
        if any(file.lower().endswith(ext) for ext in image_extensions):
            image_files.append(os.path.join(input_dir, file))
    
    if not image_files:
        raise ValueError(f"目录中没有找到图片文件: {input_dir}")
    
    # 按文件名排序
    image_files.sort()
    
    print(f"找到 {len(image_files)} 张图片:")
    for i, img_file in enumerate(image_files, 1):
        print(f"  {i}. {os.path.basename(img_file)}")
    
    # 生成输出文件名
    if output_path is None:
        dir_name = os.path.basename(input_dir.rstrip('/'))
        output_path = os.path.join(os.path.dirname(input_dir), f"{dir_name}_comic.pdf")
    
    # 转换图片为PDF
    try:
        # 打开第一张图片作为封面
        cover_image = Image.open(image_files[0])
        
        # 确保图片是RGB模式（PDF需要）
        if cover_image.mode != 'RGB':
            cover_image = cover_image.convert('RGB')
        
        # 处理其他图片
        other_images = []
        for img_path in image_files[1:]:
            img = Image.open(img_path)
            if img.mode != 'RGB':
                img = img.convert('RGB')
            other_images.append(img)
        
        # 保存为PDF
        if other_images:
            cover_image.save(
                output_path,
                "PDF",
                resolution=100.0,
                save_all=True,
                append_images=other_images
            )
        else:
            # 只有一张图片的情况
            cover_image.save(output_path, "PDF", resolution=100.0)
        
        print(f"\n✅ PDF生成成功!")
        print(f"📁 输出文件: {output_path}")
        print(f"📄 总页数: {len(image_files)}")
        print(f"🎨 封面: {os.path.basename(image_files[0])}")
        
        return output_path
        
    except Exception as e:
        raise RuntimeError(f"PDF生成失败: {str(e)}")

def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description="将图片目录转换为PDF文件",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法:
  python images_to_pdf.py /path/to/images
  python images_to_pdf.py /path/to/images -o output.pdf
  python images_to_pdf.py /Users/xt/LXT/code/trae/1018_doubao/temp/7af133b3-8d98-404d-aaaa-a52bec0440a6
        """
    )
    
    parser.add_argument(
        'input_dir',
        help='包含图片的目录路径'
    )
    
    parser.add_argument(
        '-o', '--output',
        help='输出PDF文件路径（可选，默认自动生成）'
    )
    
    args = parser.parse_args()
    
    try:
        # 转换图片为PDF
        output_file = images_to_pdf(args.input_dir, args.output)
        
        # 显示文件大小
        file_size = os.path.getsize(output_file)
        if file_size > 1024 * 1024:
            size_str = f"{file_size / (1024 * 1024):.1f} MB"
        else:
            size_str = f"{file_size / 1024:.1f} KB"
        
        print(f"📊 文件大小: {size_str}")
        
    except Exception as e:
        print(f"❌ 错误: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()