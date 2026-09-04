---
layout: post
title: "Python基础练习"
tags: [Python,学习总结]
---

这是学习Python后的总结(主要是对练习进行总结)

## 一：入口约定

```py
if __name__ == "__main__":
    print("Hello")
```

## 二：题解

```py
class Soultion:
    def __init__(self):
        pass
    def Circle(self,radius: float)->tuple[float,float]:
        """读取圆的半径（浮点数），用 f-string 输出周长和面积，面积保留 2 位小数。"""
        return round(2*3.14*radius,2),round(3.14*radius*radius,2)
    def function1(self, tem: float)->float:
        """读取一个温度（摄氏度，浮点数），转换为华氏度（F = C * 9 / 5 + 32）后输出"""
        return round(tem * 9 / 5 + 32,2)
    def function2(self, num1: int,num2: int)->None:
        """读取两个整数，分别输出它们的和、差、积、整除结果、取模结果和幂运算结果"""
        print(f"和：{num1}+{num2}={num1+num2}")
        print(f"差：{num1}-{num2}={num1-num2}")
        print(f"积：{num1}*{num2}={num1*num2}")
        print(f"整除{num1}//{num2}={num1//num2}")
        print(f"取模：{num1}%{num2}={num1%num2}")
    def function3(self)->str:
        """读取用户输入的名字，如果为空（直接回车），用 or 提供默认值 访客"""
        name = input("输入名字") or "匿名"
        return (f"名字是{name}")
    def function4(self,num: int)->bool:
        """读取一个整数 n，判断 n 是否在 [10, 20, 30, 40] 这个列表中（用 in），再判断 n 是否能同时被 3 和 5 整除（用 and）"""
        return num in [10,20,30,40] and num % 3 == 0 and num % 5 == 0
    def function5(self, n : int)->str:
        """读取一个分数（0-100 的整数），输出对应等级：90 以上"优秀"、80-89"良好"、60-79"及格"、60 以下"不及格"""
        if n <0 or n > 100 :
            return "成绩不合法"
        if n>=90 and n<=100:
            return "优秀"
        if n<=89 and n>=80:
            return "良好"
        if n<=79 and n>=60:
            return "及格"
        if n>=0 and n<=59:
            return "不及格"
    def function6(self)->int:
        """用 input() 读取三个数，输出其中的最大值"""
        max_val = 0
        i = 0
        while i < 3:
            try:
                num = int(input("输入一个数字"))
                if num > max_val:
                    max_val = num
                i+=1
            except ValueError:
                print("「ERROR」请输入正确的数字")
        return max_val 
    def function7(self)->int:
        """用 for 和 range() 计算 1 到 100 的和，并输出结果"""
        return sum( i for i in range(1,101) if i %2==0)
    def function8(self, num: int) -> bool:
        """判断一个正整数是否为素数：遍历 2 到 n-1若能整除则 break循环正常结束没 break则说明是素数"""
        if num < 2:
            return False
        for i in range(2, num):
            if num % i == 0:
                print(f"{num} 能被 {i} 整除")
                return False  # 直接返回 False
        return True

    def function9(self) -> None:
        """打印九九乘法表"""
        i, j = 1, 1
        while i <= 9:
            j = 1
            while j <= i:
                print(f"{i}*{j} = {i*j}", end=" ")
                j += 1
            print()
            i += 1

    def function10(self) -> None:
        """input() 循环读取用户输入的数字，输入 q 退出；每次输入累加到一个列表中。退出后用 for 遍历列表，输出所有数字、个数和平均值。"""
        val = []
        while True:
            num = input("输入数字（输入 q 退出）: ")
            if num.lower() == 'q':  # 支持大小写
                break
            try:
                val.append(float(num))
            except ValueError:
                print("【ERROR】输入的不是数字")

        if not val:
            print("没有输入任何数字")
            return

        for item in val:
            print(item)
        print(f"个数: {len(val)}")
        print(f"平均值: {sum(val) / len(val):.2f}")

    def is_palindrome(self, s: str) -> bool:
        """判断字符串 s 是否为回文"""
        i, j = 0, len(s) - 1
        while i < j:
            if s[i] != s[j]:
                return False
            i += 1
            j -= 1
        return True

    def safe_int(self, s: str, default: int = 0) -> int:  # 修正类型：default 应该是 int
        """尝试把字符串转成整数，失败时返回 default"""
        try:
            return int(s)
        except (ValueError, TypeError):
            return default

    def Lint(self, L1: list) -> None:  # 修改返回类型为 None，因为只打印不返回
        """一个包含 10 个整数的列表，用切片分别取出前 3 个、后 3 个、中间部分，并反转整个列表（用切片）"""
        print("前3个:", L1[:3])
        print("后3个:", L1[-3:])
        print("反转:", L1[::-1])

    def read_file(self, file: str) -> str:
        """读取一个文件"""
        with open(file, "r", encoding="utf-8") as f:
            content = f.read()
            print(f"行数: {content.count('\n') + 1}")
            print(f"字符数: {len(content)}")
            print(f"单词数: {len(content.split())}")
        return content

    def remove_negatives(self, numbers: list) -> list:  # 添加 self
        """返回一个不含负数的新列表（使用列表推导式)"""
        return [num for num in numbers if num >= 0]

    def function11(self, numbers: list) -> tuple[list, list]:
        """用列表推导式生成 1 到 50 中所有能被 3 整除的数，再生成它们的平方列表"""
        # 修正：应该生成 1-50 的数，而不是使用传入的 numbers
        nums = [num for num in range(1, 51) if num % 3 == 0]
        squares = [num ** 2 for num in nums]
        return nums, squares
    def function12(self) -> int:
        """用 input() 读取一个英文句子，统计其中元音字母（a/e/i/o/u，不区分大小写）的个数"""
        sign = ['a','A','e','E','i','I','o','O','u','U']
        word = input("输入一个英文语句")
        count = 0
        for i in word:
            if i in sign:
                count +=1
        return count
    def function13(self,s1 :str)-> None:
        """读取一段文字，统计每个字符（不含空格）出现的次数，按出现次数从高到低排序输出。"""
        d1 = {}
        for char in s1:
            if char != ' ':  # 排除空格
                d1[char] = d1.get(char, 0) + 1
        sorted_items = sorted(d1.items(), key=lambda x: x[1], reverse=True)
        for char, count in sorted_items:
            print(f"{char}出现{count}次",end="  ")
    def function14(self,path : str,write_path : str)-> None:
        """读取一个 CSV 格式的成绩文件（每行 姓名,分数，如 Alice,85），计算每个人的等级（90+ 优秀、80+ 良好、60+ 及格、其余不及格），把结果写入新文件 grades.txt"""
        student = {}
        with open(path, "r",encoding="utf-8") as f:
            for line in f:
                line = line.strip()  # 去除换行符和首尾空格
                if line:  # 跳过空行
                # 按逗号分割
                    parts = line.split(',')
                    if len(parts) == 2:
                        key = parts[0].strip()  # 去除可能的空格
                        value = float(parts[1].strip())  
                        student[key] = value
                    else:
                        print(f"跳过无效行: {line}")
            with open(write_path, "w", encoding='utf-8') as f:
                # 遍历学生字典
                for name, score in student.items():
                # 计算等级
                    if score >= 90:
                        grade = "优秀"
                    elif score >= 80:
                        grade = "良好"
                    elif score >= 60:
                        grade = "及格"
                    else:
                        grade = "不及格"
   
                    f.write(f"{name},{score},{grade}\n")
    def set_score(self,score: int)->None:
        if not 0 <= score <= 100:
            raise InvalidScoreError(f"分数必须在 0-100 之间，得到 {score}")
        print(f"设置分数：{score}")
    def fibonacci(self,limit:int)->int:
        """斐波那契数列"""
        a, b = 0, 1
        num = 0
        while num < limit:
            yield a
            a, b = b, a + b
            num +=1
```

## 三：模块引用和路径拼接

如果目录结构如下：
```bash
workspace
--lib
struct_lib.py
text.py (该文件下为需要引用的函数)
--python
1.1.py
```
引用需拼接路径
```py
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib')) 
from math_tools import text
if __name__ == "__main__":
    a =text()
    print(a.factorial(9))
    print(a.is_prime(13))
```

说明： 一般寻找import是在同级目录下的可以通过修改sys.path让Python解释器更换目录寻找

以及引用非同级目录的文件需要路径拼接如：
```py
source_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'source')
```

## 四：类的继承以及抽象类

以链表为例

```py
from abc import ABC, abstractmethod
class List(ABC): #抽象类
    @abstractmethod
    def __init__(self):
        pass
    @abstractmethod
    def List_print(self):
        pass
class Link_list(List):
    class Node:
        def __init__(self, data=None):
            self.data = data
            self.next = None
    
    def __init__(self):
        self.head = None
        self._size = 0
    
    def List_print(self):
        """遍历链表"""
        if self.head is None:
            print("空链表")
            return
        current = self.head
        elements = []
        while current:
            elements.append(str(current.data))
            current = current.next
        print(" -> ".join(elements))
    def insert_at_tail(self, data):
        """在链表尾部插入元素"""
        new_node = self.Node(data)  # 使用内部类
        if self.head is None:
            self.head = new_node
        else:
            current = self.head
            while current.next:
                current = current.next
            current.next = new_node
        self._size += 1

    def delete_at_position(self, position):
        """删除指定位置的节点"""
        if position < 0 or position >= self._size:
            raise IndexError("位置超出范围")
        if position == 0:
            self.head = self.head.next
            self._size -= 1
            return
        current = self.head
        for _ in range(position - 1):
            current = current.next
        current.next = current.next.next
        self._size -= 1


class Double_Link(List):
    class Node:
        def __init__(self, data=None):
            self.data = data
            self.next = None
            self.prev = None
    def __init__(self):
        self.head = None
        self._size = 0
    def List_print(self):
        if self.head is None:
            print("空链表")
            return
        current = self.head
        elements = []
        elements.append(str(current.data))
        current = current.next
        
        # 然后继续遍历，直到回到head
        while current != self.head:
            elements.append(str(current.data))
            current = current.next
        print(" -> ".join(elements))
    def insert_at_tail(self,data):
        new_node = self.Node(data)
        if self.head is None:
            self.head = new_node
            self.head.next = self.head
            self.head.prev = self.head
            self._size +=1
        else:
            tail = self.head.prev         
            new_node.prev = tail
            new_node.next = self.head
            tail.next = new_node           
            self.head.prev = new_node
            self._size +=1
    def delete_at_position(self, position):
        current = self.head
        if position < 0 or position >= self._size:
            raise IndexError("位置超出范围")
        if position == 0 and self._size > 1:
            curr = self.head
            self.head = self.head.next
            self.head.prev = curr.prev
            curr.prev.next = self.head
            curr.next = None
            curr.prev = None
            del curr
            self._size -=1
            return
        if position == 0 and size ==1:
            self.head = None
            self._size -=1
            return
        current = self.head
        for _ in range(position):
            current = current.next
        current.next.prev = current.prev
        current.prev.next = current.next
        current.next = None
        current.prev = None
        del current
        self._size -= 1
```

之后可能会进行补充目前的就这些了