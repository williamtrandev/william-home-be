/**
 * Tối ưu hóa các giao dịch thanh toán giữa các thành viên
 * @param {Object} amountPerPerson - Object chứa số tiền mỗi người cần trả/nhận
 * @returns {Array} Danh sách các giao dịch tối ưu
 */
const minimizeTransactions = (amountPerPerson) => {
	// Tách thành 2 nhóm: người phải trả và người sẽ nhận
	const debtors = Object.entries(amountPerPerson)
		.filter(([_, amount]) => amount < 0)
		.map(([id, amount]) => ({ id, amount: Math.abs(amount) }));

	const creditors = Object.entries(amountPerPerson)
		.filter(([_, amount]) => amount > 0)
		.map(([id, amount]) => ({ id, amount }));

	const transactions = [];

	// Xử lý từng người phải trả
	for (const debtor of debtors) {
		let remainingDebt = debtor.amount;

		// Tìm người nhận để thanh toán
		for (const creditor of creditors) {
			if (creditor.amount === 0) continue;

			const transferAmount = Math.min(remainingDebt, creditor.amount);
			if (transferAmount > 0) {
				transactions.push({
					from: debtor.id,
					to: creditor.id,
					amount: Math.round(transferAmount)
				});

				remainingDebt -= transferAmount;
				creditor.amount -= transferAmount;

				if (remainingDebt === 0) break;
			}
		}
	}

	return transactions;
};

/**
 * Tính toán chi tiêu và tạo danh sách thanh toán
 * @param {Array} expenses - Danh sách chi tiêu
 * @param {Array} members - Danh sách thành viên
 * @returns {Object} Kết quả tính toán
 */
const calculateExpenses = (expenses, members) => {
	// Tính tổng chi phí
	const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

	// Tính số tiền trung bình mỗi người cần trả và làm tròn
	const averageExpense = Math.round(totalExpenses / members.length);

	// Tính số tiền mỗi người cần trả hoặc nhận
	const amountPerPerson = {};
	members.forEach(member => {
		const memberExpenses = expenses.filter(e => e.createdBy && e.createdBy._id.toString() === member.user._id.toString());
		const totalMemberExpense = memberExpenses.reduce((sum, e) => sum + e.amount, 0);
		// Làm tròn số tiền mỗi người cần trả/nhận
		amountPerPerson[member.user._id] = Math.round(totalMemberExpense - averageExpense);
	});

	// Tối ưu hóa giao dịch
	const transactions = minimizeTransactions(amountPerPerson);

	return {
		totalExpenses,
		averageExpense,
		amountPerPerson,
		transactions
	};
};

module.exports = {
	calculateExpenses
}; 