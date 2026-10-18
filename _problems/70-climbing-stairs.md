---
title: "爬楼梯"
difficulty: 简单
tags: [动态规划, 数学]
---

## 题目描述

假设你正在爬楼梯，需要 `n` 阶你才能到达楼顶。每次你可以爬 1 或 2 个台阶，你有多少种不同的方法可以爬到楼顶呢？

## 思路

动态规划。状态转移方程：`f(n) = f(n-1) + f(n-2)`，即到达第 `n` 阶的方法数等于到达第 `n-1` 阶与第 `n-2` 阶方法数之和。用滚动变量优化空间到 O(1)。

- 时间复杂度：O(n)
- 空间复杂度：O(1)

## C++ 解法

```cpp
class Solution {
public:
    int climbStairs(int n) {
        if (n <= 2) return n;
        int a = 1, b = 2;
        for (int i = 3; i <= n; ++i) {
            int c = a + b;
            a = b;
            b = c;
        }
        return b;
    }
};
```

## Python 解法

```python
class Solution:
    def climbStairs(self, n: int) -> int:
        if n <= 2:
            return n
        a, b = 1, 2
        for _ in range(3, n + 1):
            a, b = b, a + b
        return b
```
