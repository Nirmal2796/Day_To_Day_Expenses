const Expense = require('../models/expense');

const sequelize = require('../util/database');

const UserServices=require('../services/userServices');


function pageData(page,expenses_per_page,totalExpenses){

    const pageData={
        currentPage:page,
        hasNextPage: expenses_per_page* page < totalExpenses,
        nextPage:page+1,
        hasPreviousPage:page>1,
        previousPage:page-1,
        total:totalExpenses,
        lastPage:Math.ceil(totalExpenses/expenses_per_page)
    }

    return pageData;
}

exports.getExpenses = async (req, res) => {
    try {
        const page=Number(req.query.page) || 1;
        const expenses_per_page=Number(req.query.limit) ;

        const totalExpenses=await Expense.count({where:{userId:req.user.id}});

        const expenses = await UserServices.getExpenses(req,{
            offset:(page-1) * expenses_per_page,
            limit:expenses_per_page
        });


        const pageData=pageData(page,expenses_per_page,totalExpenses);

        res.status(200).json({expenses,pageData});
    }
    catch (err) {
        console.log(err);
        res.status(500).json({success:false});
    }
}

exports.addExpense = async (req, res) => {

        const t= await sequelize.transaction();

    try {

        const amount = req.body.amount;
        const category = req.body.category;
        const description = req.body.description;

        const page=Number(req.query.page) || 1;
        const expenses_per_page=Number(req.query.limit) ;

       
        const totalExpensesUser =  req.user.totalExpenses + Number(amount);
        
        // console.log(totalExpenses);

        const expense = await req.user.createExpense({
            amount: amount,
            category: category,
            description: description,
            date: new Date()
        },{transaction:t});

       

        await req.user.update({totalExpenses:totalExpensesUser},{transaction:t});

        await t.commit();

        const totalExpensesPage=await Expense.count({where:{userId:req.user.id}});

        const pageData=pageData(page,expenses_per_page,totalExpensesPage);

        res.status(201).json({ newExpense: expense , pageData:pageData});
    }
    catch (err) {
        await t.rollback();
        console.log(err);
        res.status(500).json({success:false});
    }

}

exports.deleteExpense = async (req, res) => {

    const t= await sequelize.transaction();

    try {

        const id = req.params.id;

        const page=Number(req.query.page) || 1;
        const expenses_per_page=Number(req.query.limit) ;


        const expense = await req.user.getExpenses({ where: { id } },{transaction:t})

        const totalExpenses =  req.user.totalExpenses - Number(expense[0].amount);
        await req.user.update({totalExpenses:totalExpenses},{transaction:t});
        // console.log(expense);
        expense[0].destroy();

        await t.commit();

        const totalExpensesPage=await Expense.count({where:{userId:req.user.id}});

        const pageData=pageData(page,expenses_per_page,totalExpensesPage);

        // await t.commit();

        res.status(200).json({expense,pageData});
    }
    catch (err) {
        await t.rollback();
        console.log(err);
        res.status(500).json({success:false});
    }
}

