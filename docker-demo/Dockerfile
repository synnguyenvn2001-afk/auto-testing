# Sử dụng image Node.js Alpine siêu nhẹ để giảm kích thước image tối đa
FROM node:20-alpine

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Sao chép các file code của server vào container
COPY server.js ./
COPY public/ ./public/

# Khai báo cổng mà container sẽ lắng nghe bên trong
EXPOSE 8080

# Chạy ứng dụng Node.js
CMD ["node", "server.js"]
