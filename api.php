<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

// Database configuration
$host = 'localhost';
$dbname = 'inventory_system';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit();
}

// Get request method and action
$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

// Handle different actions
switch($action) {
    case 'login':
        handleLogin($pdo);
        break;
    case 'getCategories':
        getCategories($pdo);
        break;
    case 'addCategory':
        addCategory($pdo);
        break;
    case 'deleteCategory':
        deleteCategory($pdo);
        break;
    case 'getInventory':
        getInventory($pdo);
        break;
    case 'addInventoryItem':
        addInventoryItem($pdo);
        break;
    case 'updateInventoryItem':
        updateInventoryItem($pdo);
        break;
    case 'deleteInventoryItem':
        deleteInventoryItem($pdo);
        break;
    case 'getSales':
        getSales($pdo);
        break;
    case 'addSale':
        addSale($pdo);
        break;
    case 'getSalesHistory':
        getSalesHistory($pdo);
        break;
    default:
        echo json_encode(['error' => 'Invalid action']);
}

// Login function
function handleLogin($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';
    
    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user && password_verify($password, $user['password'])) {
        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username']
            ]
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Invalid credentials']);
    }
}

// Categories functions
function getCategories($pdo) {
    $stmt = $pdo->query("SELECT * FROM categories ORDER BY created_at DESC");
    $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($categories);
}

function addCategory($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    $name = $data['name'] ?? '';
    
    $stmt = $pdo->prepare("INSERT INTO categories (name, created_at) VALUES (?, NOW())");
    $stmt->execute([$name]);
    
    echo json_encode([
        'success' => true,
        'id' => $pdo->lastInsertId(),
        'message' => 'Category added successfully'
    ]);
}

function deleteCategory($pdo) {
    $id = $_GET['id'] ?? 0;
    
    $stmt = $pdo->prepare("DELETE FROM categories WHERE id = ?");
    $stmt->execute([$id]);
    
    echo json_encode(['success' => true, 'message' => 'Category deleted successfully']);
}

// Inventory functions
function getInventory($pdo) {
    $stmt = $pdo->query("SELECT * FROM inventory ORDER BY created_at DESC");
    $inventory = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($inventory);
}

function addInventoryItem($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $stmt = $pdo->prepare("
        INSERT INTO inventory 
        (name, category, quantity, unit, price, expiration_date, image, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    
    $stmt->execute([
        $data['name'],
        $data['category'],
        $data['quantity'],
        $data['unit'],
        $data['price'],
        $data['expirationDate'] ?? null,
        $data['image'] ?? null
    ]);
    
    echo json_encode([
        'success' => true,
        'id' => $pdo->lastInsertId(),
        'message' => 'Item added successfully'
    ]);
}

function updateInventoryItem($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'] ?? 0;
    
    $stmt = $pdo->prepare("
        UPDATE inventory 
        SET name = ?, category = ?, quantity = ?, unit = ?, 
            price = ?, expiration_date = ?, image = ?
        WHERE id = ?
    ");
    
    $stmt->execute([
        $data['name'],
        $data['category'],
        $data['quantity'],
        $data['unit'],
        $data['price'],
        $data['expirationDate'] ?? null,
        $data['image'] ?? null,
        $id
    ]);
    
    echo json_encode(['success' => true, 'message' => 'Item updated successfully']);
}

function deleteInventoryItem($pdo) {
    $id = $_GET['id'] ?? 0;
    
    $stmt = $pdo->prepare("DELETE FROM inventory WHERE id = ?");
    $stmt->execute([$id]);
    
    echo json_encode(['success' => true, 'message' => 'Item deleted successfully']);
}

// Sales functions
function getSales($pdo) {
    $stmt = $pdo->query("
        SELECT DATE(sale_date) as date, COUNT(*) as count, SUM(total) as total
        FROM sales
        GROUP BY DATE(sale_date)
        ORDER BY date DESC
    ");
    $sales = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($sales);
}

function addSale($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Start transaction
    $pdo->beginTransaction();
    
    try {
        // Insert sale
        $stmt = $pdo->prepare("
            INSERT INTO sales (total, sale_date) 
            VALUES (?, NOW())
        ");
        $stmt->execute([$data['total']]);
        $saleId = $pdo->lastInsertId();
        
        // Insert sale items
        $stmt = $pdo->prepare("
            INSERT INTO sale_items (sale_id, item_id, item_name, quantity, price) 
            VALUES (?, ?, ?, ?, ?)
        ");
        
        foreach ($data['items'] as $item) {
            $stmt->execute([
                $saleId,
                $item['id'],
                $item['name'],
                $item['quantity'],
                $item['price']
            ]);
            
            // Update inventory
            $updateStmt = $pdo->prepare("
                UPDATE inventory 
                SET quantity = quantity - ? 
                WHERE id = ?
            ");
            $updateStmt->execute([$item['quantity'], $item['id']]);
        }
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'sale_id' => $saleId,
            'message' => 'Sale completed successfully'
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function getSalesHistory($pdo) {
    $stmt = $pdo->query("
        SELECT s.id, s.total, s.sale_date,
               GROUP_CONCAT(
                   CONCAT(si.item_name, ':', si.quantity, ':', si.price)
                   SEPARATOR '|'
               ) as items
        FROM sales s
        LEFT JOIN sale_items si ON s.id = si.sale_id
        GROUP BY s.id
        ORDER BY s.sale_date DESC
    ");
    
    $sales = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format items
    foreach ($sales as &$sale) {
        $itemsArray = [];
        if ($sale['items']) {
            $items = explode('|', $sale['items']);
            foreach ($items as $item) {
                list($name, $quantity, $price) = explode(':', $item);
                $itemsArray[] = [
                    'name' => $name,
                    'quantity' => (int)$quantity,
                    'price' => (float)$price
                ];
            }
        }
        $sale['items'] = $itemsArray;
    }
    
    echo json_encode($sales);
}
?>