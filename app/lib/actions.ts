'use server';

import {z} from 'zod';
import {sql} from "@vercel/postgres";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";

const InvoiceSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(['pending', 'paid']),
    date: z.string()
});

const CreateInvoice = InvoiceSchema.omit({id: true, date: true})

export async function createInvoice(formData: FormData) {
    const {customerId, amount, status} = CreateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status')
    })
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    try {
        await sql`
        insert into invoices(customer_id, amount, status, date) values (${customerId}, ${amountInCents}, ${status}, ${date})
       `;
    } catch (error) {
        return {
            message: 'Database Error: Failed to Create Invoice.',
        }
    }

    revalidatePath('/dashboard/invoices')
    redirect('/dashboard/invoices')
}

const UpdateInvoice = InvoiceSchema.omit({id: true, date: true});

export async function updateInvoice(id: string, formData: FormData) {
    const {customerId, amount, status} = UpdateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status')
    })
    const amountInCents = amount * 100;

    try {

        await sql`
        update invoices
        set customer_id = ${customerId},
            amount = ${amountInCents},
            status = ${status}
        where id = ${id}
        `;
    } catch (error) {
        return {
            message: 'Database Error: Failed to Update Invoice.',
        }
    }

    revalidatePath(`/dashboard/invoices`);
    redirect(`/dashboard/invoices`);
}

export async function deleteInvoiceById(id: string) {
    try {
        await sql`
        delete from invoices where id = ${id}
       `;
    } catch (error) {
        return {
            message: 'Database Error: Failed to Delete Invoice.',
        }
    }
    revalidatePath(`/dashboard/invoices`);
}