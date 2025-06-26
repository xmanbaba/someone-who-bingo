import React from 'react';

// Square Details Modal Component
const SquareDetailsModal = ({
    show,
    onClose,
    onSave,
    question,
    currentNames,
    isChecked,
    onToggleCheck,
    onAddName,
    onRemoveName,
    nameInput,
    onNameInputChange
}) => {
    if (!show) return null; // If 'show' prop is false, don't render the modal

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md space-y-6 border-4 border-purple-300 transform scale-95 animate-scale-up">
                <h3 className="text-3xl font-extrabold text-purple-800 text-center mb-5 font-inter-rounded">🎯 Square Details</h3>

                {/* Displays the question for the selected bingo square */}
                <p className="text-xl font-semibold text-gray-800 mb-4 leading-relaxed font-inter-rounded">{question}</p>

                {/* Checkbox to mark the square as found/checked */}
                <div className="flex items-center mb-5">
                    <input
                        type="checkbox"
                        id="squareChecked"
                        checked={isChecked} // Controlled by parent's state
                        onChange={onToggleCheck} // Calls parent function to toggle check status
                        className="h-6 w-6 text-purple-600 rounded-md border-gray-300 focus:ring-purple-500 transition duration-200 cursor-pointer"
                    />
                    <label htmlFor="squareChecked" className="ml-3 text-gray-700 font-bold text-lg font-inter-rounded">
                        Mark as Found
                    </label>
                </div>

                {/* Section for adding/removing names, shown only if the square is checked */}
                {isChecked && (
                    <div className="space-y-4">
                        <h4 className="text-xl font-bold text-gray-800 flex items-center font-inter-rounded">
                            <svg className="w-5 h-5 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                            People Found:
                        </h4>
                        {currentNames.length > 0 ? (
                            <ul className="list-none space-y-2 text-gray-700 max-h-36 overflow-y-auto pr-2">
                                {/* List of names associated with the square */}
                                {currentNames.map((name, idx) => (
                                    <li key={idx} className="flex justify-between items-center bg-gray-100 p-3 rounded-lg shadow-sm border border-gray-200 font-inter-rounded">
                                        <span className="font-medium text-lg">{name}</span>
                                        <button
                                            onClick={() => onRemoveName(name)} // Calls parent function to remove a name
                                            className="ml-3 p-2 text-red-500 hover:text-red-700 transition duration-200 rounded-full hover:bg-red-100"
                                            aria-label={`Remove ${name}`}
                                        >
                                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12l1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500 italic text-center py-2 font-inter-rounded">No one found yet for this square.</p>
                        )}

                        {/* Input for adding new names */}
                        <div className="flex space-x-2 mt-4">
                            <input
                                type="text"
                                className="flex-grow shadow-sm appearance-none border border-blue-300 rounded-lg py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-300 transition duration-200 font-inter-rounded"
                                placeholder="Enter name"
                                value={nameInput} // Controlled by parent's state
                                onChange={onNameInputChange} // Calls parent function to update input
                            />
                            <button
                                onClick={onAddName} // Calls parent function to add name
                                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200 flex items-center font-inter-rounded"
                            >
                                <svg className="h-5 w-5 mr-1" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                                Add
                            </button>
                        </div>
                    </div>
                )}

                {/* Action buttons for modal */}
                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={onClose} // Calls parent function to close modal without saving
                        className="px-6 py-3 bg-gray-300 text-gray-800 font-bold rounded-xl hover:bg-gray-400 transition duration-200 shadow-md transform hover:scale-105 font-inter-rounded"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSave} // Calls parent function to save changes and close modal
                        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold rounded-xl hover:from-purple-600 hover:to-blue-600 transition duration-200 shadow-lg transform hover:scale-105 font-inter-rounded"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SquareDetailsModal;
