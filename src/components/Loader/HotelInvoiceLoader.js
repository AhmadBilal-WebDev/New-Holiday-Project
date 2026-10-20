import React from 'react'
export default function HotelInvoiceLoader() {
    return (
        <div className='p-3'>
            <div className='placeholder-glow'>
                <span className='placeholder col-12 rounded' style={{ height: '10em' }} />

                <div className='row'>
                    <div className='col-md-5 col-12'>
                        <span className='placeholder col-12 rounded mt-4' style={{ height: '3em' }} />
                    </div>
                    <div className='col-md-2 col-12'></div>
                    <div className='col-md-5 col-12'>
                        <span className='placeholder col-12 rounded mt-4' style={{ height: '3em' }} />
                    </div>
                </div>
                <span className='placeholder col-12 rounded mt-4' style={{ height: '10em' }} />
                <div className='row mt-4'>
                    <div className='col-12 '>
                        <span className='placeholder col-12 bg-primary  rounded' style={{ height: '3em' }} />
                        <span className='placeholder col-12 rounded mt-2' style={{ height: '3em' }} />
                        <span className='placeholder col-12 rounded mt-2' style={{ height: '3em' }} />
                        <span className='placeholder col-12 rounded mt-2' style={{ height: '3em' }} />
                    </div>
                    <div className='col-12'>
                        <span className='placeholder col-12 rounded mt-4' style={{ height: '10em' }} />
                        <span className='placeholder col-12 mt-4  rounded' style={{ height: '3em' }} />
                    </div>
                </div>
            </div>
        </div>
    )
}
