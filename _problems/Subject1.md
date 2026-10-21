---
title: "蓝桥杯备考系统专题1"
difficulty: 简单
tags: [python,格式化输出]
---

## 1.成绩统计 ★☆☆

### 题目描述
给出 n 名同学的成绩，计算平均分（保留 1 位小数）和及格率（成绩 ≥ 60 为及格，百分比保留 1 位小数）。

**输入格式**
第一行一个整数 n（1 ≤ n ≤ 1000）。
第二行 n 个整数，表示成绩（0 ≤ 成绩 ≤ 100）。

**输出格式**
第一行平均分；第二行及格率，形如 `60.0%`。

**样例输入**

```text
5
90 80 70 60 50
```

**样例输出**

```text
70.0
80.0%
```
### Python题解:

```python
data = list(map(int, sys.stdin.read().split()))
people_num = data[0]
m = data[1:]
avg = sum(m)/people_num
rate = sum(x>60 for x in m) / (n * 100)
print(f"{avg:.1f}")
print(f"{rate:.1f}%")
```

### 随笔：
多行输入的读取：

```python
data = list(map(int,sys.stdin.read().split())
```
对于该题的读取效果为 [5 , 90 , 80 , 70 , 60 , 50] 一维的

如果分行读取建议
```python
input = sys.stdin.readline
n = int(input())
grid = [list(map(int, input().split())) for _ in range(n)]
```
```python
grid = [[5] ,[90,80,70,60,50]] 为二维列表
```

也可以对
```python
date = list(map(int,sys.stdin.read().split())
```
进行处理
```python
data = list(map(int, sys.stdin.read().split()))
rows, cols = data[0], data[1]
grid = [data[2 + i*m : 2 + (i+1)*m] for i in range(n)]
```

## 2.报数淘汰 ★★☆

### 题目描述
n 个人围成一圈，编号 1~n。从 1 号开始报数，报到 3 的人退出圈子，下一个人重新从 1 开始报数。求最后留下的人的编号。

**输入格式**
一行一个整数 n（1 ≤ n ≤ 1000）。

**输出格式**
最后留下的人的编号。

**样例输入**

```text
5
```

**样例输出**

```text
4
```

### python题解：

```python
n = int(input())
people = list(range(1, n + 1))
idx = 0
while len(people) > 1:
    idx = (idx + 2) % len(people)
    people.pop(idx)
print(people[0])
```

### 随笔:
|轮次|当前 `people`|计算 `idx`|淘汰编号|淘汰后|
|---|---|---|---|---|
|1|`[1,2,3,4,5]`|`(0+2)%5 = 2`|3|`[1,2,4,5]`|
|2|`[1,2,4,5]`|`(2+2)%4 = 0`|1|`[2,4,5]`|
|3|`[2,4,5]`|`(0+2)%3 = 2`|5|`[2,4]`|
|4|`[2,4]`|`(2+2)%2 = 0`|2|`[4]`|

## 3.黑色星期五 ★☆☆

### 题目描述：
如果某个月的 13 号是星期五，就称这个月“不吉利”。给定年份 y（2000 ≤ y ≤ 2100），求这一年共有多少个不吉利的月份。

**输入格式**
一行一个整数 y。

**输出格式**
一个整数。

**样例输入**

```text
2024
```

**样例输出**

```text
2
```

### python题解：

```python
import datetime
y = int(input())
ans = 0
for m in range(1, 13):
    if datetime.date(y, m, 13).weekday() == 4:
        ans += 1
print(ans)
```

### 随笔:
```python
datetime.date(y, m, 13).weekday() 
#判断某年 某月 某日是星期几 (0-6)
```
## 4.矩阵转置 ★☆☆

### 题目描述：
给定 n 行 m 列的整数矩阵，输出它的转置（m 行 n 列）。

**输入格式**
第一行两个整数 n、m（1 ≤ n, m ≤ 100）。
接下来 n 行，每行 m 个整数。

**输出格式**
共 m 行，每行 n 个整数，用空格分隔。

**样例输入**

```text
2 3
1 2 3
4 5 6
```

**样例输出**

```text
1 4
2 5
3 6
```

### python题解：
```python
data = list(map(int,sys.stdin.read().split()))
rows = data[0]
cols = data[1]
num = data[2:]
grid = [[num[i+j*rows]for j in range(cols)]for i in range(rows)]
for row in grid:
    print(*row)    
```

## 5.进制转换 ★☆☆

### 题目描述：
给定非负整数 n 和进制 r（2 ≤ r ≤ 16），输出 n 的 r 进制表示；10 以上的数码用大写字母 A~F。

**输入格式**
一行两个整数 n、r（0 ≤ n ≤ 10^9）。

**输出格式**
一个字符串，表示转换结果。

**样例输入**

```text
255 16
```

**样例输出**

```text
FF
```

### python题解：

```py
INPUT = list(map(int,sys.stdin.read().split()))
num,r = INPUT[0] , INPUT[1]
dict1 = {10:'A',11:'B',12:'C',13:'D',14:'E',15:'F'}
A = []
while num >= r:
    A.append(num % r)
    num = num // r
if not A:
    A = [0]
res = []
for x in A:
    if x >= 10:
        res.append(dict1[x])
    else:
        res.append(str(x))

print("".join(res))
```